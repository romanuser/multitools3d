-- =====================================================================
-- MULTIFERRAMENTA 3D — Sequência automática de e-mails (boas-vindas)
-- Rode no SQL Editor do projeto do Multiferramenta 3D. Pode rodar de novo.
-- =====================================================================

-- Quem não quer receber (link "descadastrar" em todo e-mail)
alter table public.accounts add column if not exists marketing_opt_out boolean not null default false;
alter table public.accounts add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists accounts_unsubscribe_token_uniq on public.accounts(unsubscribe_token);

-- Registro do que já foi enviado (cada etapa uma vez por conta)
create table if not exists public.onboarding_emails (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  step       text not null,
  sent_at    timestamptz not null default now(),
  unique (account_id, step)
);
alter table public.onboarding_emails enable row level security;   -- só o servidor (chave de serviço) mexe
