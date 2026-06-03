# EdgeOne Supabase CMS

Reusable CMS and storefront template for foreign-trade showcase websites. It provides shared content types, Supabase schema, admin foundations, SEO utilities, inquiry APIs, and a WordPress/WooCommerce migration pipeline. Each client site is deployed independently to EdgeOne Pages with its own Supabase project.

## Packages

- `packages/core`: public interfaces, content models, SEO helpers, and frontend data client.
- `packages/migrator`: migration connector contracts plus WordPress WXR and WooCommerce CSV support.
- `apps/site`: starter Next.js App Router site with a generic admin and storefront.
- `supabase/schema.sql`: database schema, indexes, and RLS policies.

## Quick Start

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
pnpm typecheck
pnpm --filter @global-trade/site dev
```

Copy `apps/site/.env.example` to `apps/site/.env.local` and fill Supabase credentials before running the site against a real project.

## Environment

Required for a real Supabase-backed site:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Media upload provider is controlled only by environment variables. Imported WordPress media stays as remote URLs; admin uploads default to Supabase Storage.

```bash
MEDIA_UPLOAD_PROVIDER=supabase
SUPABASE_MEDIA_BUCKET=media
```

Reserved for future Ali OSS uploads:

```bash
MEDIA_UPLOAD_PROVIDER=ali_oss
ALI_OSS_ACCESS_KEY_ID=
ALI_OSS_ACCESS_KEY_SECRET=
ALI_OSS_BUCKET=
ALI_OSS_REGION=
ALI_OSS_ENDPOINT=
ALI_OSS_PUBLIC_BASE_URL=
ALI_OSS_PATH_PREFIX=inshow-home
```

Never commit `.env.local`, Supabase service-role keys, Ali OSS access keys, `.next`, `.edgeone`, or `edgeone-static`.

## Migration Flow

1. Export WordPress WXR/XML from the old site.
2. Export WooCommerce products CSV with custom meta columns enabled.
3. Open `/admin/migrations`, upload the files, and preview the detected content.
4. Confirm import to normalize products, categories, posts, pages, media references, SEO fields, and redirects.

The first version intentionally excludes carts, checkout, orders, payments, inventory transactions, and customer accounts.

## CNB + EdgeOne

`.cnb.yml` builds the site with pnpm and deploys through the EdgeOne Pages CLI. Set these variables in CNB:

```bash
EDGEONE_API_TOKEN=
EDGEONE_PROJECT_NAME=edgeone-supabase-cms
```

`EDGEONE_PROJECT_NAME` is optional; it defaults to `edgeone-supabase-cms`.
