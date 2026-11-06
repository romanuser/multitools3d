-- =====================================================================
-- Carretéis: número, situação (lacrado / em uso / acabado) e desconto inteligente
-- Rodar UMA vez no Supabase (SQL Editor). Pode rodar de novo sem estragar nada.
-- =====================================================================

-- 1) Colunas novas ----------------------------------------------------
alter table public.filament_stock add column if not exists numero integer;
alter table public.filament_stock add column if not exists status text;
alter table public.filament_stock add column if not exists aberto_em timestamptz;
alter table public.filament_stock add column if not exists acabado_em timestamptz;

-- 2) Situação dos carretéis que já existem ----------------------------
--    zerado = acabado · cheio (nunca descontado) = lacrado · o resto = em uso
update public.filament_stock
   set status = case
                  when current_grams <= 0 then 'acabado'
                  when current_grams >= spool_weight_g then 'lacrado'
                  else 'em_uso'
                end,
       acabado_em = case when current_grams <= 0 then now() else acabado_em end
 where status is null;

alter table public.filament_stock alter column status set default 'lacrado';
alter table public.filament_stock alter column status set not null;
do $$ begin
  alter table public.filament_stock add constraint filament_stock_status_chk check (status in ('lacrado', 'em_uso', 'acabado'));
exception when duplicate_object then null; end $$;

-- 3) Número de cada carretel dentro do mesmo tipo (material + cor + marca) --
with numerados as (
  select id, row_number() over (
           partition by account_id, lower(trim(material)), lower(trim(color)), lower(trim(coalesce(brand, '')))
           order by created_at, id) as n
    from public.filament_stock
)
update public.filament_stock fs set numero = numerados.n
  from numerados where fs.id = numerados.id and fs.numero is null;

create index if not exists filament_stock_tipo_idx
  on public.filament_stock (account_id, lower(trim(material)), lower(trim(color)), lower(trim(coalesce(brand, ''))));

-- 4) Carretel novo ganha o próximo número do tipo ----------------------
create or replace function public.mf_carretel_numero()
 returns trigger language plpgsql as $$
begin
  if new.numero is null then
    select coalesce(max(numero), 0) + 1 into new.numero
      from public.filament_stock
     where account_id = new.account_id
       and lower(trim(material)) = lower(trim(new.material))
       and lower(trim(color)) = lower(trim(new.color))
       and lower(trim(coalesce(brand, ''))) = lower(trim(coalesce(new.brand, '')));
  end if;
  if new.status = 'em_uso' and new.aberto_em is null then new.aberto_em := now(); end if;
  return new;
end $$;

drop trigger if exists mf_carretel_numero on public.filament_stock;
create trigger mf_carretel_numero before insert on public.filament_stock
  for each row execute function public.mf_carretel_numero();

-- 5) Desconto inteligente ----------------------------------------------
--  * Desconto AUTOMÁTICO (vem da fila, ou seja, de dentro de outro gatilho) num carretel
--    LACRADO, havendo um EM USO do mesmo tipo: o desconto vai pro que está em uso.
--  * Se o carretel acabar no meio, o que faltou sai do próximo do mesmo tipo.
--  * Zerou: vira ACABADO. Voltou a ter saldo (ajuste manual): volta a EM USO.
--  * Lacrado que foi descontado: vira EM USO (foi aberto).
--  O ajuste MANUAL (botão Ajustar) nunca é redirecionado.
create or replace function public.mf_carretel_desconto()
 returns trigger language plpgsql as $$
declare
  v_auto      boolean := pg_trigger_depth() > 1 and coalesce(current_setting('mf.sem_redirect', true), '') <> '1';
  v_delta     numeric := old.current_grams - new.current_grams;       -- quanto está saindo
  v_destino   record;
  v_sobra     numeric;
begin
  -- desconto automático num lacrado com um aberto do mesmo tipo → vai pro aberto
  if v_auto and v_delta > 0 and old.status = 'lacrado' then
    select id into v_destino from public.filament_stock
     where account_id = old.account_id and id <> old.id and status = 'em_uso' and current_grams > 0
       and lower(trim(material)) = lower(trim(old.material)) and lower(trim(color)) = lower(trim(old.color))
       and lower(trim(coalesce(brand, ''))) = lower(trim(coalesce(old.brand, '')))
     order by aberto_em nulls last, numero limit 1;
    if found then
      perform set_config('mf.r' || replace(old.id::text, '-', ''), v_destino.id::text, true);   -- (nome sem hífen)   -- o registro do movimento vai junto
      update public.filament_stock set current_grams = current_grams - v_delta where id = v_destino.id;
      new.current_grams := old.current_grams;                                       -- o lacrado fica intacto
      return new;
    end if;
  end if;

  -- acabou no meio de um desconto automático → o que faltou sai do próximo carretel do tipo
  if v_auto and new.current_grams < 0 then
    select id, numero into v_destino from public.filament_stock
     where account_id = old.account_id and id <> old.id and status <> 'acabado' and current_grams > 0
       and lower(trim(material)) = lower(trim(old.material)) and lower(trim(color)) = lower(trim(old.color))
       and lower(trim(coalesce(brand, ''))) = lower(trim(coalesce(old.brand, '')))
     order by (status = 'em_uso') desc, numero limit 1;
    if found then
      v_sobra := -new.current_grams;
      new.current_grams := 0;
      perform set_config('mf.sem_redirect', '1', true);
      update public.filament_stock set current_grams = current_grams - v_sobra where id = v_destino.id;
      perform set_config('mf.sem_redirect', '', true);
      insert into public.filament_movements (filament_stock_id, type, grams, note)
        values (old.id, 'ajuste_entrada', v_sobra, 'Carretel acabou: o restante saiu do carretel #' || v_destino.numero),
               (v_destino.id, 'consumo_impressao', -v_sobra, 'Continuação do carretel #' || old.numero || ' (acabou no meio)');
    end if;
  end if;

  -- situação automática
  if new.current_grams <= 0 then
    if old.status <> 'acabado' then new.status := 'acabado'; new.acabado_em := now(); end if;
  elsif old.status = 'acabado' and new.status = 'acabado' then
    new.status := 'em_uso'; new.acabado_em := null;                                 -- ganhou saldo de novo
  elsif v_delta > 0 and new.status = 'lacrado' then
    new.status := 'em_uso';                                                          -- foi usado: está aberto
  end if;
  if new.status = 'em_uso' and new.aberto_em is null then new.aberto_em := now(); end if;
  return new;
end $$;

drop trigger if exists mf_carretel_desconto on public.filament_stock;
create trigger mf_carretel_desconto before update of current_grams, status on public.filament_stock
  for each row execute function public.mf_carretel_desconto();

-- 6) O registro do movimento acompanha o redirecionamento ----------------
create or replace function public.mf_movimento_redirect()
 returns trigger language plpgsql as $$
declare v_para text;
begin
  v_para := nullif(current_setting('mf.r' || replace(new.filament_stock_id::text, '-', ''), true), '');
  if v_para is not null then
    new.filament_stock_id := v_para::uuid;
    new.note := coalesce(new.note, '') || ' (descontado do carretel aberto)';
  end if;
  return new;
end $$;

drop trigger if exists mf_movimento_redirect on public.filament_movements;
create trigger mf_movimento_redirect before insert on public.filament_movements
  for each row execute function public.mf_movimento_redirect();
