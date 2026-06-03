# Media Storage and Internationalization Plan

## Current Position

The site keeps WordPress-imported media as remote URLs. New admin uploads still use Supabase Storage today, but the upload path now goes through a media provider abstraction so Ali OSS can be added without changing every form/editor component. Media upload provider selection is controlled only by environment variables, not by Admin Settings.

Internationalization is reserved at the `site_config` level. The current frontend keeps its existing routes, and locale-prefix routing should only be enabled when translated content and localized routes are ready.

## Ali OSS Integration Plan

### Data Contract

Keep `media_assets` stable:

- `kind`: `remote` for imported WordPress assets, `local` for admin uploads.
- `storage_path`: provider path or remote URL.
- `public_url`: final public URL used by frontend pages.
- `source`: include `{ "type": "admin-upload", "provider": "supabase" | "ali_oss" }`.

Products, posts, categories, rich text, and gallery fields should continue storing media objects with `publicUrl`. They should not care which storage provider produced the URL.

### Environment Variables

Media storage config should stay in deployment environment variables:

```bash
MEDIA_UPLOAD_PROVIDER=supabase
SUPABASE_MEDIA_BUCKET=media

ALI_OSS_ACCESS_KEY_ID=
ALI_OSS_ACCESS_KEY_SECRET=
ALI_OSS_BUCKET=
ALI_OSS_REGION=
ALI_OSS_ENDPOINT=
ALI_OSS_PUBLIC_BASE_URL=
ALI_OSS_PATH_PREFIX=inshow-home
```

When Ali OSS is enabled, change `MEDIA_UPLOAD_PROVIDER=ali_oss`, implement the Ali adapter in `apps/site/lib/media-storage.ts`, and keep Supabase only as the database of record. Do not store Ali OSS credentials or provider switching controls in `site_settings`.

### CDN and Global Access

For overseas visitors, prefer an OSS bucket region close to the target audience plus CDN acceleration. If the site is mostly global B2B traffic, use a custom media domain such as `assets.example.com` and set it as `ALI_OSS_PUBLIC_BASE_URL`.

## Internationalization Plan

### Current Reserved Config

Settings now stores:

- `i18n.defaultLocale`
- `i18n.fallbackLocale`
- `i18n.locales`
- `i18n.routingStrategy`

The current default is `routingStrategy: "none"` so existing routes keep working.

### Future Route Strategy

When translated content is ready:

1. Change routing strategy to `path-prefix`.
2. Add locale-aware route handling, for example `/en/products` and `/zh-CN/products`.
3. Use `apps/site/lib/i18n.ts` to normalize locale values and build locale-aware links.
4. Add localized SEO fields first for Settings, products, categories, posts, and fixed pages.
5. Keep fallback behavior: missing translation falls back to default locale.

### Content Model Direction

Avoid duplicating product rows per language. Prefer localized JSON fields for display text:

```ts
title: string | { en: string; "zh-CN": string }
summary: string | { en: string; "zh-CN": string }
seo.title: string | { en: string; "zh-CN": string }
```

The helper `pickLocalizedValue()` already supports this future shape.
