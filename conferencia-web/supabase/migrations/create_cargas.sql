-- Migration para criar tabelas de cargas e produtos da carga

create table if not exists cargas (
  id uuid primary key default gen_random_uuid(),
  numero_carga text not null unique,
  status text default 'ABERTA',
  created_at timestamptz default now()
);

create table if not exists carga_produtos (
  id uuid primary key default gen_random_uuid(),
  carga_id uuid references cargas(id),
  produto_id uuid references products(id),
  codigo_erp text not null,
  ean13 text not null,
  descricao text not null,
  quantidade_prevista integer not null,
  quantidade_conferida integer default 0,
  status text default 'PENDENTE',
  created_at timestamptz default now()
);

create index if not exists cargas_numero_carga_idx on cargas (numero_carga);
create index if not exists carga_produtos_carga_id_idx on carga_produtos (carga_id);
create index if not exists carga_produtos_ean13_idx on carga_produtos (ean13);
create index if not exists carga_produtos_codigo_erp_idx 
on carga_produtos (codigo_erp);