-- =====================================================================
-- Comunidade (fórum de dúvidas) + Central de Calibração
-- Rodar UMA vez no Supabase (SQL Editor). Pode rodar de novo sem estragar nada.
-- Leitura: pública. Escrita: qualquer conta logada, sempre em nome dela.
-- =====================================================================

-- 1) Tabelas ------------------------------------------------------------
create table if not exists public.forum_topicos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  autor_nome text not null default 'Membro',
  categoria text not null,
  titulo text not null check (char_length(titulo) between 8 and 140),
  corpo text not null check (char_length(corpo) between 10 and 8000),
  impressora text,
  filamento text,
  fotos text[] not null default '{}',
  resolvido boolean not null default false,
  resposta_aceita uuid,
  respostas_count integer not null default 0,
  ultima_atividade timestamptz not null default now(),
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_respostas (
  id uuid primary key default gen_random_uuid(),
  topico_id uuid not null references public.forum_topicos(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  autor_nome text not null default 'Membro',
  corpo text not null check (char_length(corpo) between 2 and 8000),
  fotos text[] not null default '{}',
  uteis integer not null default 0,
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_uteis (           -- "funcionou pra mim" numa resposta
  resposta_id uuid not null references public.forum_respostas(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  primary key (resposta_id, account_id)
);

create table if not exists public.forum_denuncias (
  id uuid primary key default gen_random_uuid(),
  alvo_tipo text not null check (alvo_tipo in ('topico', 'resposta', 'perfil')),
  alvo_id uuid not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  motivo text,
  resolvida boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.calib_perfis (          -- configuração que funcionou, compartilhada
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  autor_nome text not null default 'Membro',
  impressora text not null,
  material text not null,
  marca text,
  bico integer, mesa integer, velocidade integer,
  retracao_mm numeric, retracao_vel integer, fluxo integer, pressure_advance numeric,
  notas text,
  confirmacoes integer not null default 0,
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.calib_confirmacoes (    -- "funcionou pra mim" num perfil
  perfil_id uuid not null references public.calib_perfis(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  primary key (perfil_id, account_id)
);

create index if not exists forum_topicos_lista_idx on public.forum_topicos (oculto, categoria, ultima_atividade desc);
create index if not exists forum_respostas_topico_idx on public.forum_respostas (topico_id, created_at);
create index if not exists calib_perfis_busca_idx on public.calib_perfis (oculto, material, impressora);

-- 2) Regras de acesso ----------------------------------------------------
alter table public.forum_topicos enable row level security;
alter table public.forum_respostas enable row level security;
alter table public.forum_uteis enable row level security;
alter table public.forum_denuncias enable row level security;
alter table public.calib_perfis enable row level security;
alter table public.calib_confirmacoes enable row level security;

do $$ declare t text; begin
  foreach t in array array['forum_topicos', 'forum_respostas', 'calib_perfis'] loop
    execute format('drop policy if exists "%1$s_ler" on public.%1$s', t);
    execute format('create policy "%1$s_ler" on public.%1$s for select using (not oculto)', t);
    execute format('drop policy if exists "%1$s_criar" on public.%1$s', t);
    execute format('create policy "%1$s_criar" on public.%1$s for insert to authenticated with check (account_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s_editar" on public.%1$s', t);
    execute format('create policy "%1$s_editar" on public.%1$s for update to authenticated using (account_id = auth.uid()) with check (account_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s_apagar" on public.%1$s', t);
    execute format('create policy "%1$s_apagar" on public.%1$s for delete to authenticated using (account_id = auth.uid())', t);
  end loop;
  foreach t in array array['forum_uteis', 'calib_confirmacoes'] loop
    execute format('drop policy if exists "%1$s_ler" on public.%1$s', t);
    execute format('create policy "%1$s_ler" on public.%1$s for select using (true)', t);
    execute format('drop policy if exists "%1$s_criar" on public.%1$s', t);
    execute format('create policy "%1$s_criar" on public.%1$s for insert to authenticated with check (account_id = auth.uid())', t);
    execute format('drop policy if exists "%1$s_apagar" on public.%1$s', t);
    execute format('create policy "%1$s_apagar" on public.%1$s for delete to authenticated using (account_id = auth.uid())', t);
  end loop;
end $$;

drop policy if exists "forum_denuncias_criar" on public.forum_denuncias;
create policy "forum_denuncias_criar" on public.forum_denuncias for insert to authenticated with check (account_id = auth.uid());
-- (denúncias só o administrador lê, pelo painel, com a chave de serviço)

-- o autor edita o texto e marca a solução; contadores e "oculto" ninguém mexe pela tela
revoke update on public.forum_topicos from authenticated, anon;
grant update (titulo, corpo, impressora, filamento, resolvido, resposta_aceita) on public.forum_topicos to authenticated;
revoke update on public.forum_respostas from authenticated, anon;
grant update (corpo) on public.forum_respostas to authenticated;
revoke update on public.calib_perfis from authenticated, anon;
grant update (bico, mesa, velocidade, retracao_mm, retracao_vel, fluxo, pressure_advance, notas) on public.calib_perfis to authenticated;

-- 3) Contadores automáticos ----------------------------------------------
create or replace function public.mf_forum_contar_respostas()
 returns trigger language plpgsql security definer set search_path = public as $$
begin
  update forum_topicos t set
    respostas_count = (select count(*) from forum_respostas r where r.topico_id = t.id and not r.oculto),
    ultima_atividade = case when tg_op = 'INSERT' then now() else t.ultima_atividade end
  where t.id = coalesce(new.topico_id, old.topico_id);
  return null;
end $$;
drop trigger if exists mf_forum_contar_respostas on public.forum_respostas;
create trigger mf_forum_contar_respostas after insert or delete or update of oculto on public.forum_respostas
  for each row execute function public.mf_forum_contar_respostas();

create or replace function public.mf_forum_contar_uteis()
 returns trigger language plpgsql security definer set search_path = public as $$
begin
  update forum_respostas r set uteis = (select count(*) from forum_uteis u where u.resposta_id = r.id)
   where r.id = coalesce(new.resposta_id, old.resposta_id);
  return null;
end $$;
drop trigger if exists mf_forum_contar_uteis on public.forum_uteis;
create trigger mf_forum_contar_uteis after insert or delete on public.forum_uteis
  for each row execute function public.mf_forum_contar_uteis();

create or replace function public.mf_calib_contar()
 returns trigger language plpgsql security definer set search_path = public as $$
begin
  update calib_perfis p set confirmacoes = (select count(*) from calib_confirmacoes c where c.perfil_id = p.id)
   where p.id = coalesce(new.perfil_id, old.perfil_id);
  return null;
end $$;
drop trigger if exists mf_calib_contar on public.calib_confirmacoes;
create trigger mf_calib_contar after insert or delete on public.calib_confirmacoes
  for each row execute function public.mf_calib_contar();

-- 4) Pasta pública das fotos (o site envia pelo servidor) -----------------
insert into storage.buckets (id, name, public) values ('comunidade', 'comunidade', true)
on conflict (id) do nothing;
