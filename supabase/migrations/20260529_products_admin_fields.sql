alter table public.product_categories
  add column if not exists display_title text,
  add column if not exists image jsonb,
  add column if not exists seo jsonb not null default '{}',
  add column if not exists source jsonb;

alter table public.products
  add column if not exists sku text,
  add column if not exists product_type text,
  add column if not exists tag_ids uuid[] not null default '{}',
  add column if not exists regular_price text,
  add column if not exists sale_price text,
  add column if not exists currency text,
  add column if not exists price_text text,
  add column if not exists stock_status text,
  add column if not exists stock_quantity integer,
  add column if not exists legacy_meta jsonb not null default '{}';
