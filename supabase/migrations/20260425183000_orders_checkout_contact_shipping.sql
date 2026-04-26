-- Add checkout contact and shipping details to orders

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_date timestamptz not null default timezone('utc', now()),
  total_amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  constraint orders_total_nonnegative check (total_amount >= 0),
  constraint orders_status_valid check (status in ('pending', 'paid', 'shipped', 'cancelled', 'completed'))
);

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists shipping_address_line1 text,
  add column if not exists shipping_address_line2 text,
  add column if not exists shipping_city text,
  add column if not exists shipping_state text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text,
  add column if not exists order_notes text;

create index if not exists orders_user_id_created_at_idx
  on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_price_nonnegative check (unit_price >= 0)
);

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order_items_update_own" on public.order_items;
create policy "order_items_update_own"
on public.order_items
for update
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order_items_delete_own" on public.order_items;
create policy "order_items_delete_own"
on public.order_items
for delete
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);
