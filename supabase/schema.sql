create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'admin', 'editor', 'sales', 'viewer');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.inquiry_status as enum ('new', 'contacted', 'closed', 'spam');
create type public.migration_status as enum ('draft', 'previewed', 'running', 'completed', 'failed', 'rolled_back');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'local' check (kind in ('remote', 'local')),
  source jsonb,
  storage_path text not null unique,
  public_url text not null,
  alt text,
  title text,
  caption text,
  mime_type text,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  display_title text,
  description text,
  parent_id uuid references public.product_categories(id) on delete set null,
  image jsonb,
  seo jsonb not null default '{}',
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status public.publish_status not null default 'draft',
  sku text,
  product_type text,
  summary text,
  content_json jsonb not null default '{}',
  rich_text text not null default '',
  legacy_html text,
  category_ids uuid[] not null default '{}',
  tag_ids uuid[] not null default '{}',
  primary_image jsonb,
  gallery jsonb not null default '[]',
  specifications jsonb not null default '[]',
  regular_price text,
  sale_price text,
  currency text,
  price_text text,
  stock_status text,
  stock_quantity integer,
  seo jsonb not null default '{}',
  legacy_meta jsonb not null default '{}',
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  parent_id uuid references public.post_categories(id) on delete set null,
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status public.publish_status not null default 'draft',
  author text,
  excerpt text,
  content_json jsonb not null default '{}',
  rich_text text not null default '',
  published_at timestamptz,
  modified_at timestamptz,
  category_ids uuid[] not null default '{}',
  tag_ids uuid[] not null default '{}',
  featured_image jsonb,
  seo jsonb not null default '{}',
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status public.publish_status not null default 'draft',
  content_json jsonb not null default '{}',
  rich_text text not null default '',
  seo jsonb not null default '{}',
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  status public.inquiry_status not null default 'new',
  form_type text not null default 'product_inquiry',
  subject text,
  name text not null,
  email text not null,
  phone text,
  messenger text,
  company text,
  message text not null,
  product_id uuid references public.products(id) on delete set null,
  source_url text,
  payload jsonb not null default '{}',
  field_labels jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique,
  target_path text not null,
  status_code integer not null default 301,
  created_at timestamptz not null default now()
);

create table public.migration_batches (
  id uuid primary key default gen_random_uuid(),
  source_site_url text not null,
  connector text not null,
  status public.migration_status not null default 'draft',
  summary jsonb not null default '{}',
  report jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.migration_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.migration_batches(id) on delete cascade,
  source_site_url text not null,
  source_type text not null,
  source_id text not null,
  target_table text,
  target_id uuid,
  status text not null default 'pending',
  payload jsonb not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_site_url, source_type, source_id)
);

create index products_status_updated_idx on public.products(status, updated_at desc);
create index products_sku_idx on public.products(sku);
create index posts_status_published_idx on public.posts(status, published_at desc);
create index pages_status_updated_idx on public.pages(status, updated_at desc);
create index inquiries_status_created_idx on public.inquiries(status, created_at desc);
create index inquiries_product_id_idx on public.inquiries(product_id);
create index inquiries_form_type_created_idx on public.inquiries(form_type, created_at desc);
create index migration_items_batch_idx on public.migration_items(batch_id, status);
create index migration_batches_created_by_idx on public.migration_batches(created_by);
create index product_categories_parent_id_idx on public.product_categories(parent_id);
create index post_categories_parent_id_idx on public.post_categories(parent_id);
create index site_settings_updated_by_idx on public.site_settings(updated_by);

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.media_assets enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_tags enable row level security;
alter table public.products enable row level security;
alter table public.post_categories enable row level security;
alter table public.post_tags enable row level security;
alter table public.posts enable row level security;
alter table public.pages enable row level security;
alter table public.inquiries enable row level security;
alter table public.redirects enable row level security;
alter table public.migration_batches enable row level security;
alter table public.migration_items enable row level security;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.has_role(allowed public.user_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(private.current_user_role() = any(allowed), false)
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
create trigger media_assets_set_updated_at before update on public.media_assets for each row execute function public.set_updated_at();
create trigger product_categories_set_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
create trigger product_tags_set_updated_at before update on public.product_tags for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger post_categories_set_updated_at before update on public.post_categories for each row execute function public.set_updated_at();
create trigger post_tags_set_updated_at before update on public.post_tags for each row execute function public.set_updated_at();
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger pages_set_updated_at before update on public.pages for each row execute function public.set_updated_at();
create trigger inquiries_set_updated_at before update on public.inquiries for each row execute function public.set_updated_at();
create trigger migration_batches_set_updated_at before update on public.migration_batches for each row execute function public.set_updated_at();
create trigger migration_items_set_updated_at before update on public.migration_items for each row execute function public.set_updated_at();

revoke execute on function private.current_user_role() from public, anon, authenticated;
revoke execute on function private.has_role(public.user_role[]) from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.has_role(public.user_role[]) to authenticated;

create policy "authenticated can read allowed profiles"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or (select private.has_role(array['owner','admin']::public.user_role[])));

create policy "owners and admins can create profiles"
on public.profiles for insert
to authenticated
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "owners and admins can update profiles"
on public.profiles for update
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])))
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "owners and admins can delete profiles"
on public.profiles for delete
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "public can read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

create policy "admins can create settings"
on public.site_settings for insert
to authenticated
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can update settings"
on public.site_settings for update
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])))
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can delete settings"
on public.site_settings for delete
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "public can read media"
on public.media_assets for select
to anon, authenticated
using (true);

create policy "staff can create media"
on public.media_assets for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update media"
on public.media_assets for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete media"
on public.media_assets for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "public can read product categories"
on public.product_categories for select
to anon, authenticated
using (true);

create policy "staff can create product categories"
on public.product_categories for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update product categories"
on public.product_categories for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete product categories"
on public.product_categories for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "public can read product tags"
on public.product_tags for select
to anon, authenticated
using (true);

create policy "staff can create product tags"
on public.product_tags for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update product tags"
on public.product_tags for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete product tags"
on public.product_tags for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "anon can read published products"
on public.products for select
to anon
using (status = 'published');

create policy "authenticated can read allowed products"
on public.products for select
to authenticated
using (status = 'published' or (select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can create products"
on public.products for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update products"
on public.products for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete products"
on public.products for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "public can read post categories"
on public.post_categories for select
to anon, authenticated
using (true);

create policy "staff can create post categories"
on public.post_categories for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update post categories"
on public.post_categories for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete post categories"
on public.post_categories for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "public can read post tags"
on public.post_tags for select
to anon, authenticated
using (true);

create policy "staff can create post tags"
on public.post_tags for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update post tags"
on public.post_tags for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete post tags"
on public.post_tags for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "anon can read published posts"
on public.posts for select
to anon
using (status = 'published');

create policy "authenticated can read allowed posts"
on public.posts for select
to authenticated
using (status = 'published' or (select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can create posts"
on public.posts for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update posts"
on public.posts for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete posts"
on public.posts for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "anon can read published pages"
on public.pages for select
to anon
using (status = 'published');

create policy "authenticated can read allowed pages"
on public.pages for select
to authenticated
using (status = 'published' or (select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can create pages"
on public.pages for insert
to authenticated
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update pages"
on public.pages for update
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete pages"
on public.pages for delete
to authenticated
using ((select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "public can create inquiries"
on public.inquiries for insert
to anon, authenticated
with check (
  status = 'new'
  and form_type ~ '^[a-z][a-z0-9_]{0,63}$'
  and char_length(trim(name)) between 1 and 200
  and email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  and char_length(trim(message)) between 1 and 5000
  and (subject is null or char_length(subject) <= 300)
  and (phone is null or char_length(phone) <= 80)
  and (messenger is null or char_length(messenger) <= 120)
  and (company is null or char_length(company) <= 200)
  and jsonb_typeof(payload) = 'object'
  and jsonb_typeof(field_labels) = 'object'
  and octet_length(payload::text) <= 20000
  and octet_length(field_labels::text) <= 10000
  and octet_length(metadata::text) <= 10000
);

create policy "staff can read inquiries"
on public.inquiries for select
to authenticated
using ((select private.has_role(array['owner','admin','sales','viewer']::public.user_role[])));

create policy "sales can manage inquiries"
on public.inquiries for update
to authenticated
using ((select private.has_role(array['owner','admin','sales']::public.user_role[])))
with check ((select private.has_role(array['owner','admin','sales']::public.user_role[])));

create policy "public can read redirects"
on public.redirects for select
to anon, authenticated
using (true);

create policy "admins can create redirects"
on public.redirects for insert
to authenticated
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can update redirects"
on public.redirects for update
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])))
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can delete redirects"
on public.redirects for delete
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can read migrations"
on public.migration_batches for select
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can create migrations"
on public.migration_batches for insert
to authenticated
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can update migrations"
on public.migration_batches for update
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])))
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can delete migrations"
on public.migration_batches for delete
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can read migration items"
on public.migration_items for select
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can create migration items"
on public.migration_items for insert
to authenticated
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can update migration items"
on public.migration_items for update
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])))
with check ((select private.has_role(array['owner','admin']::public.user_role[])));

create policy "admins can delete migration items"
on public.migration_items for delete
to authenticated
using ((select private.has_role(array['owner','admin']::public.user_role[])));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "staff can read media bucket"
on storage.objects for select
to authenticated
using (bucket_id = 'media' and (select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can upload media bucket"
on storage.objects for insert
to authenticated
with check (bucket_id = 'media' and (select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can update media bucket"
on storage.objects for update
to authenticated
using (bucket_id = 'media' and (select private.has_role(array['owner','admin','editor']::public.user_role[])))
with check (bucket_id = 'media' and (select private.has_role(array['owner','admin','editor']::public.user_role[])));

create policy "staff can delete media bucket"
on storage.objects for delete
to authenticated
using (bucket_id = 'media' and (select private.has_role(array['owner','admin','editor']::public.user_role[])));

grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;

grant select on public.site_settings to anon, authenticated;
grant select on public.media_assets to anon, authenticated;
grant select on public.product_categories to anon, authenticated;
grant select on public.product_tags to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.post_categories to anon, authenticated;
grant select on public.post_tags to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant select on public.pages to anon, authenticated;
grant select on public.redirects to anon, authenticated;
grant insert on public.inquiries to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.media_assets to authenticated;
grant select, insert, update, delete on public.product_categories to authenticated;
grant select, insert, update, delete on public.product_tags to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.post_categories to authenticated;
grant select, insert, update, delete on public.post_tags to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.pages to authenticated;
grant select, insert, update, delete on public.inquiries to authenticated;
grant select, insert, update, delete on public.redirects to authenticated;
grant select, insert, update, delete on public.migration_batches to authenticated;
grant select, insert, update, delete on public.migration_items to authenticated;
