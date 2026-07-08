-- ============================================================
-- Schema da Conferência — rode isto no SQL Editor do Supabase
-- ============================================================

-- Catálogo de produtos (substitui a importação por CSV)
create table if not exists products (
  code text primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Itens bipados (packing list). Cada linha é 1 número de série conferido.
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  load_number text not null,
  product_code text not null references products(code),
  product_name text not null,
  serial text not null,
  scanned_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (load_number, serial) -- impede série duplicada dentro da mesma carga
);

create index if not exists scans_load_idx on scans (load_number);

-- Segurança em nível de linha (RLS): só usuários autenticados acessam
alter table products enable row level security;
alter table scans enable row level security;

create policy "authenticated_select_products"
  on products for select to authenticated using (true);

create policy "authenticated_manage_products"
  on products for all to authenticated using (true) with check (true);

create policy "authenticated_select_scans"
  on scans for select to authenticated using (true);

create policy "authenticated_insert_scans"
  on scans for insert to authenticated with check (true);

create policy "authenticated_delete_scans"
  on scans for delete to authenticated using (true);

-- Exemplo de produtos (apague depois de testar)
insert into products (code, name) values
  ('7891000100103', 'Notebook 15 polegadas'),
  ('7891000100202', 'Mouse sem fio')
on conflict (code) do nothing;
