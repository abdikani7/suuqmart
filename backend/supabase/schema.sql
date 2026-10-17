-- =====================================================================
-- SuuqMart — Supabase backend (tables, indexes, triggers, RPC, RLS, storage, seed)
-- Run the whole file once in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- TABLES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  gallery text[] not null default '{}',
  specs jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity > 0),
  unique (user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  total numeric(12,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  payment_method text not null check (payment_method in ('cash_on_delivery','mobile_money')),
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

-- ---------- INDEXES ----------
create index products_category_idx on public.products(category_id);
create index products_created_idx on public.products(created_at desc);
create index products_name_idx on public.products(lower(name));
create index cart_items_user_idx on public.cart_items(user_id);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index order_items_order_idx on public.order_items(order_id);

-- ---------- HELPER FUNCTIONS ----------
-- security definer so policies on profiles don't recurse into themselves
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- TRIGGERS ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Put stock back when an order is cancelled
create or replace function public.restore_stock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p set stock = p.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end $$;

create trigger orders_restore_stock
  after update of status on public.orders
  for each row execute function public.restore_stock_on_cancel();

-- ---------- RPC: atomic checkout ----------
-- p_items = [{"product_id": "...", "quantity": 2}, ...]
-- Prices and stock are read from the database, never trusted from the client.
create or replace function public.place_order(
  p_name text, p_phone text, p_address text, p_payment text, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_total numeric := 0;
  it record;
  prod record;
begin
  if v_uid is null then raise exception 'You must be logged in to place an order'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty';
  end if;
  if p_payment not in ('cash_on_delivery','mobile_money') then
    raise exception 'Unsupported payment method';
  end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' or coalesce(trim(p_address),'') = '' then
    raise exception 'Name, phone and address are required';
  end if;

  insert into public.orders (user_id, total, payment_method, shipping_name, shipping_phone, shipping_address)
  values (v_uid, 0, p_payment, trim(p_name), trim(p_phone), trim(p_address))
  returning id into v_order;

  for it in
    select (x->>'product_id')::uuid as product_id, (x->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) x
  loop
    if it.quantity is null or it.quantity <= 0 then raise exception 'Invalid quantity'; end if;
    select * into prod from public.products where id = it.product_id and is_active for update;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    if prod.stock < it.quantity then
      raise exception 'Not enough stock for % (only % left)', prod.name, prod.stock;
    end if;
    update public.products set stock = stock - it.quantity where id = prod.id;
    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price)
    values (v_order, prod.id, prod.name, it.quantity, prod.price);
    v_total := v_total + prod.price * it.quantity;
  end loop;

  update public.orders set total = v_total where id = v_order;
  delete from public.cart_items where user_id = v_uid;
  return v_order;
end $$;

-- ---------- RPC: admin overview numbers ----------
create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Forbidden'; end if;
  return json_build_object(
    'products',  (select count(*) from public.products),
    'orders',    (select count(*) from public.orders),
    'revenue',   (select coalesce(sum(total),0) from public.orders where status <> 'cancelled'),
    'customers', (select count(*) from public.profiles)
  );
end $$;

revoke all on function public.place_order(text,text,text,text,jsonb) from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.place_order(text,text,text,text,jsonb) to authenticated;
grant execute on function public.admin_stats() to authenticated;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- profiles: own row (cannot change own role) + admins read all
create policy "profiles read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own, role locked" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

-- categories & products: public read, admin write
create policy "categories public read" on public.categories for select using (true);
create policy "categories admin insert" on public.categories for insert with check (public.is_admin());
create policy "categories admin update" on public.categories for update using (public.is_admin()) with check (public.is_admin());
create policy "categories admin delete" on public.categories for delete using (public.is_admin());

create policy "products public read" on public.products for select using (is_active or public.is_admin());
create policy "products admin insert" on public.products for insert with check (public.is_admin());
create policy "products admin update" on public.products for update using (public.is_admin()) with check (public.is_admin());
create policy "products admin delete" on public.products for delete using (public.is_admin());

-- cart: only your own rows
create policy "cart own rows" on public.cart_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: read own, admin reads/updates all. Inserts happen only through place_order().
create policy "orders read own or admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "order_items read own or admin" on public.order_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ---------- STORAGE: product-images bucket ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images public read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ---------- SEED DATA ----------
insert into public.categories (name, slug) values
  ('Laptops','laptops'), ('Phones','phones'), ('Accessories','accessories'),
  ('Components','components'), ('Gadgets','gadgets');

insert into public.products (name, description, price, stock, category_id, image_url, gallery, specs)
select v.name, v.description, v.price, v.stock, c.id, v.img, array[v.img], v.specs::jsonb
from (values
  ('Aero 14 Ultrabook','Light 14-inch ultrabook with all-day battery life. Built for students and travel.',899.00,12,'laptops','https://placehold.co/800x800/10214a/5b8cff/png?text=Aero+14','{"CPU":"Core i5 12th Gen","RAM":"16 GB","Storage":"512 GB NVMe","Display":"14 inch FHD IPS","Battery":"Up to 12 h"}'),
  ('ProBook 15 Workstation','Powerful 15-inch laptop for coding, design and video work.',1249.00,6,'laptops','https://placehold.co/800x800/10214a/5b8cff/png?text=ProBook+15','{"CPU":"Core i7 13th Gen","RAM":"32 GB","Storage":"1 TB NVMe","Display":"15.6 inch QHD","GPU":"RTX 4050"}'),
  ('Nova X5 5G','Fast 5G phone with a bright AMOLED screen and a 50 MP camera.',549.00,20,'phones','https://placehold.co/800x800/10214a/5b8cff/png?text=Nova+X5','{"Display":"6.6 inch AMOLED 120 Hz","RAM":"8 GB","Storage":"256 GB","Camera":"50 MP","Battery":"5000 mAh"}'),
  ('Orbit S2','Reliable everyday smartphone with a two-day battery.',329.00,25,'phones','https://placehold.co/800x800/10214a/5b8cff/png?text=Orbit+S2','{"Display":"6.5 inch IPS","RAM":"6 GB","Storage":"128 GB","Camera":"48 MP","Battery":"5500 mAh"}'),
  ('Glide Wireless Mouse','Quiet, ergonomic wireless mouse with USB-C charging.',29.00,60,'accessories','https://placehold.co/800x800/10214a/5b8cff/png?text=Glide+Mouse','{"Connection":"2.4 GHz + Bluetooth","DPI":"Up to 4000","Battery":"Up to 60 days"}'),
  ('Tactile K75 Keyboard','Compact mechanical keyboard with hot-swappable switches.',79.00,30,'accessories','https://placehold.co/800x800/10214a/5b8cff/png?text=Tactile+K75','{"Layout":"75%","Switches":"Hot-swap, red","Connection":"USB-C + Bluetooth"}'),
  ('Hub7 USB-C Dock','7-in-1 USB-C hub: HDMI, USB-A x3, SD, microSD and 100 W pass-through.',45.00,40,'accessories','https://placehold.co/800x800/10214a/5b8cff/png?text=Hub7+Dock','{"Ports":"HDMI, 3x USB-A, SD, microSD, USB-C PD","Power":"100 W pass-through"}'),
  ('Rapid 1TB NVMe SSD','PCIe 4.0 NVMe SSD for fast boot and load times.',89.00,18,'components','https://placehold.co/800x800/10214a/5b8cff/png?text=Rapid+1TB','{"Capacity":"1 TB","Interface":"PCIe 4.0 x4","Read":"7000 MB/s","Write":"5300 MB/s"}'),
  ('Vector 16GB DDR5 Kit','2 x 8 GB DDR5-5600 memory kit for modern desktops.',74.00,3,'components','https://placehold.co/800x800/10214a/5b8cff/png?text=Vector+DDR5','{"Capacity":"16 GB (2x8)","Speed":"5600 MT/s","Type":"DDR5 DIMM"}'),
  ('Pulse Smartwatch','Smartwatch with heart-rate tracking, GPS and a 7-day battery.',119.00,15,'gadgets','https://placehold.co/800x800/10214a/5b8cff/png?text=Pulse+Watch','{"Display":"1.4 inch AMOLED","Battery":"7 days","Water resistance":"5 ATM","GPS":"Built-in"}'),
  ('Echo Buds ANC','True wireless earbuds with active noise cancelling.',59.00,35,'gadgets','https://placehold.co/800x800/10214a/5b8cff/png?text=Echo+Buds','{"Noise cancelling":"Active","Battery":"8 h + 24 h case","Connection":"Bluetooth 5.3"}')
) as v(name, description, price, stock, cat, img, specs)
join public.categories c on c.slug = v.cat;

-- ---------- MAKE YOUR FIRST ADMIN ----------
-- 1) Sign up in the app. 2) Find your user id in Authentication > Users. 3) Run:
--    update public.profiles set role = 'admin' where id = 'PASTE-YOUR-USER-ID';
