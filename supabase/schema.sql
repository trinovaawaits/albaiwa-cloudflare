create extension if not exists pgcrypto;

create table owners (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  pass_hash text not null,
  created_at timestamptz default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text,
  hours text,
  logo_url text,
  login_code text unique not null,
  pass_hash text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  category text,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  colors text[] default '{}',
  sizes text[] default '{}',
  image_url text,
  created_at timestamptz default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  address text not null,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity unique,
  customer_id uuid not null references customers(id),
  shop_id uuid not null references shops(id),
  status text not null default 'placed',
  payment_method text not null check (payment_method in ('cod','online')),
  payment_status text not null default 'unpaid',
  total numeric(12,2) not null,
  access_token text unique not null,
  created_at timestamptz default now()
);

create table order_items (
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  qty int not null check (qty > 0),
  unit_price numeric(12,2) not null,
  primary key (order_id, product_id)
);

create table threads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','shop','rider','system')),
  sender_id uuid,
  body text not null,
  kind text not null default 'text',
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  channel text not null default 'app',
  status text not null default 'queued',
  message text not null,
  created_at timestamptz default now()
);

create table riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  vehicle text,
  area text,
  online boolean default false,
  pass_hash text,
  active boolean default true,
  created_at timestamptz default now()
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null default 'open',
  rider_id uuid references riders(id),
  agreed_fee numeric(12,2),
  cod_collected boolean default false,
  proof_url text,
  created_at timestamptz default now()
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  rider_id uuid not null references riders(id),
  amount numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- Row-level security on, with no public policies: only the server (service key) can read or write.
alter table owners enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table threads enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table riders enable row level security;
alter table deliveries enable row level security;
alter table offers enable row level security;
