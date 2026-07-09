-- Migration para criar tabela de produtos com EAN13

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  codigo_erp text not null,
  ean13 text not null,
  descricao text not null,
  unidade text,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index if not exists products_codigo_erp_idx 
on products (codigo_erp);

create index if not exists products_ean13_idx 
on products (ean13);

create unique index if not exists products_codigo_erp_unique_idx 
on products (codigo_erp);

create unique index if not exists products_ean13_unique_idx 
on products (ean13);
