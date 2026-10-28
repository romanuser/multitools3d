-- =====================================================================
-- MULTIFERRAMENTA 3D — Caçador de promoções (Mercado Livre → Telegram / WhatsApp / página /ofertas)
-- Rode no SQL Editor do projeto do Multiferramenta 3D. Pode rodar de novo sem problema.
-- Todas as tabelas ficam fechadas (RLS sem regras): só o servidor (chave de serviço) mexe.
-- =====================================================================
create table if not exists public.ofertas_token_ml (
  id integer primary key default 1 check (id = 1),     -- uma linha só
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ofertas_itens (
  id text primary key,                                  -- ex.: MLB1234567890
  titulo text not null,
  permalink text not null,
  thumb text,
  busca text,
  preco numeric(12,2),
  preco_original numeric(12,2),
  frete_gratis boolean not null default false,
  full_ml boolean not null default false,
  loja_oficial boolean not null default false,
  primeiro_visto timestamptz not null default now(),
  visto_em timestamptz not null default now()
);

create table if not exists public.ofertas_precos (       -- histórico: uma linha por leitura
  id bigint generated always as identity primary key,
  item_id text not null references public.ofertas_itens(id) on delete cascade,
  preco numeric(12,2) not null,
  coletado_em timestamptz not null default now()
);
create index if not exists ofertas_precos_item_idx on public.ofertas_precos (item_id, coletado_em desc);

create table if not exists public.ofertas_publicadas (
  id bigint generated always as identity primary key,
  item_id text not null references public.ofertas_itens(id) on delete cascade,
  preco numeric(12,2) not null,
  desconto numeric(6,4) not null default 0,
  motivo text,
  busca text,
  link text not null,
  mensagem_wa text,
  telegram_ok boolean not null default false,
  erro text,
  publicado_em timestamptz not null default now()
);
create index if not exists ofertas_publicadas_data_idx on public.ofertas_publicadas (publicado_em desc);
create index if not exists ofertas_publicadas_item_idx on public.ofertas_publicadas (item_id, publicado_em desc);

create table if not exists public.ofertas_execucoes (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  resumo jsonb
);

alter table public.ofertas_token_ml enable row level security;
alter table public.ofertas_itens enable row level security;
alter table public.ofertas_precos enable row level security;
alter table public.ofertas_publicadas enable row level security;
alter table public.ofertas_execucoes enable row level security;
