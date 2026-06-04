import { slugify } from "@global-trade/core";
import { requireAdminRole, createCookieSupabaseClient } from "@/lib/auth";
import { revalidateFrontendCache } from "@/lib/cache-tags";
import { isSupabaseConfigured } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoreImage = {
  id?: number;
  src?: string;
  thumbnail?: string;
  name?: string;
  alt?: string;
};

type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent?: number;
  count?: number;
  image?: StoreImage | null;
  permalink?: string;
};

type StoreProduct = {
  id: number;
  name: string;
  slug: string;
  type?: string;
  permalink?: string;
  sku?: string;
  short_description?: string;
  description?: string;
  prices?: {
    price?: string;
    regular_price?: string;
    sale_price?: string;
    currency_code?: string;
    currency_symbol?: string;
  };
  price_html?: string;
  images?: StoreImage[];
  categories?: Array<{ id: number; name: string; slug: string; link?: string }>;
  is_in_stock?: boolean;
  stock_availability?: { text?: string; class?: string };
};

type SupabaseClient = Awaited<ReturnType<typeof createCookieSupabaseClient>>;

type ExistingCategoryRow = {
  id: string;
  slug: string;
  description?: string | null;
  image?: unknown;
  source?: unknown;
};

type ExistingProductRow = {
  id: string;
  slug: string;
  sku?: string | null;
  product_type?: string | null;
  summary?: string | null;
  rich_text?: string | null;
  legacy_html?: string | null;
  content_json?: Record<string, unknown> | null;
  primary_image?: unknown;
  gallery?: unknown;
  regular_price?: string | null;
  sale_price?: string | null;
  currency?: string | null;
  price_text?: string | null;
  stock_status?: string | null;
  category_ids?: unknown;
  source?: unknown;
};

export async function POST(request: Request) {
  await requireAdminRole(["owner", "admin", "editor"]);

  const payload = await request.json().catch(() => ({}));
  const siteUrl = normalizeSiteUrl(String(payload.siteUrl ?? ""));
  const apiKey = String(payload.apiKey ?? "").trim();
  if (!siteUrl) return NextResponse.json({ error: "Valid site URL is required." }, { status: 400 });

  const warnings: string[] = [];
  const [categories, products] = await Promise.all([
    fetchStorePages<StoreCategory>(siteUrl, "/wp-json/wc/store/v1/products/categories", warnings),
    fetchStorePages<StoreProduct>(siteUrl, "/wp-json/wc/store/v1/products", warnings)
  ]);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      message: "WooCommerce data fetched. Supabase is not configured, so no records were updated.",
      source: "wc-store-api",
      apiKeyProvided: Boolean(apiKey),
      fetched: { categories: categories.length, products: products.length },
      updated: { categories: 0, products: 0, media: 0 },
      skipped: { categories: categories.length, products: products.length },
      warnings
    });
  }

  const supabase = await createCookieSupabaseClient();
  const result = {
    source: "wc-store-api",
    apiKeyProvided: Boolean(apiKey),
    fetched: { categories: categories.length, products: products.length },
    updated: { categories: 0, products: 0, media: 0 },
    skipped: { categories: 0, products: 0 },
    missing: { categories: [] as string[], products: [] as string[] },
    samples: { categories: [] as string[], products: [] as string[] },
    warnings
  };

  const categoryIdByWooId = new Map<number, string>();
  const categoryIdBySlug = new Map<string, string>();
  await syncCategories(supabase, siteUrl, categories, categoryIdByWooId, categoryIdBySlug, result);
  await syncProducts(supabase, siteUrl, products, categoryIdByWooId, categoryIdBySlug, result);
  revalidateFrontendCache();

  return NextResponse.json({
    message: "WooCommerce REST data sync completed.",
    ...result
  });
}

async function syncCategories(
  supabase: SupabaseClient,
  siteUrl: string,
  categories: StoreCategory[],
  categoryIdByWooId: Map<number, string>,
  categoryIdBySlug: Map<string, string>,
  result: {
    updated: { categories: number; media: number };
    skipped: { categories: number };
    missing: { categories: string[] };
    samples: { categories: string[] };
  }
) {
  const { data: existingCategories, error } = await supabase.from("product_categories").select("*");
  if (error) throw new Error(error.message);

  const rows = (existingCategories ?? []) as ExistingCategoryRow[];
  const existingBySlug = new Map(rows.map((category) => [String(category.slug), category]));
  const existingBySourceId = new Map<string, ExistingCategoryRow>();
  for (const existing of rows) {
    for (const sourceId of readSourceIds(existing.source)) {
      existingBySourceId.set(sourceId, existing);
    }
  }
  const apiCategoryById = new Map(categories.map((category) => [category.id, category]));
  for (const category of categories) {
    const slugPath = apiCategoryPathSlug(category, apiCategoryById, "slug");
    const titlePath = apiCategoryPathSlug(category, apiCategoryById, "title");
    const existing =
      existingBySourceId.get(String(category.id)) ??
      existingBySlug.get(category.slug) ??
      existingBySlug.get(slugPath) ??
      existingBySlug.get(titlePath);
    if (!existing?.id) {
      result.skipped.categories += 1;
      result.missing.categories.push(`${category.slug} (${titlePath})`);
      continue;
    }

    categoryIdByWooId.set(category.id, existing.id);
    categoryIdBySlug.set(category.slug, existing.id);
    categoryIdBySlug.set(existing.slug, existing.id);
    categoryIdBySlug.set(slugPath, existing.id);
    categoryIdBySlug.set(titlePath, existing.id);

    const image = category.image?.src ? remoteMediaValue(category.image.src, category.name, category.image.alt) : null;
    if (image) await upsertRemoteMedia(supabase, siteUrl, image, category.image ?? undefined, "woocommerce:category-image", result);

    const patch = compact({
      description: existing.description ? undefined : htmlText(category.description ?? ""),
      image: existing.image || !image ? undefined : image,
      source: mergeSource(existing.source, {
        siteUrl,
        sourceType: "woocommerce:product-category",
        sourceId: String(category.id),
        sourceSlug: category.slug,
        sourceUrl: category.permalink ?? new URL(`/product-category/${category.slug}/`, siteUrl).toString()
      })
    });

    if (Object.keys(patch).length === 0) {
      result.skipped.categories += 1;
      continue;
    }

    const { error: updateError } = await supabase.from("product_categories").update(patch).eq("id", existing.id);
    if (updateError) throw new Error(updateError.message);
    result.updated.categories += 1;
    if (result.samples.categories.length < 8) result.samples.categories.push(category.slug);
  }
}

async function syncProducts(
  supabase: SupabaseClient,
  siteUrl: string,
  products: StoreProduct[],
  categoryIdByWooId: Map<number, string>,
  categoryIdBySlug: Map<string, string>,
  result: {
    updated: { products: number; media: number };
    skipped: { products: number };
    missing: { products: string[] };
    samples: { products: string[] };
  }
) {
  const { data: existingProducts, error } = await supabase.from("products").select("*");
  if (error) throw new Error(error.message);

  const rows = (existingProducts ?? []) as ExistingProductRow[];
  const existingBySlug = new Map(rows.map((product) => [String(product.slug), product]));
  const existingBySourceId = new Map(
    rows
      .map((product) => [String(readSourceId(product.source)), product] as const)
      .filter(([sourceId]) => sourceId && sourceId !== "undefined")
  );

  for (const product of products) {
    const existing = existingBySourceId.get(String(product.id)) ?? existingBySlug.get(product.slug);
    if (!existing?.id) {
      result.skipped.products += 1;
      result.missing.products.push(product.slug);
      continue;
    }

    const gallery = (product.images ?? [])
      .map((image) => (image.src ? remoteMediaValue(image.src, image.name ?? product.name, image.alt) : null))
      .filter((image): image is ReturnType<typeof remoteMediaValue> => Boolean(image));
    for (const image of product.images ?? []) {
      if (!image.src) continue;
      await upsertRemoteMedia(supabase, siteUrl, remoteMediaValue(image.src, image.name ?? product.name, image.alt), image, "woocommerce:product-image", result);
    }

    const categoryIds = (product.categories ?? [])
      .map((category) => categoryIdByWooId.get(category.id) ?? categoryIdBySlug.get(category.slug))
      .filter((id): id is string => Boolean(id));

    const patch = compact({
      sku: existing.sku ? undefined : emptyToNull(product.sku),
      product_type: existing.product_type ? undefined : emptyToNull(product.type),
      summary: existing.summary ? undefined : htmlText(product.short_description ?? ""),
      rich_text: existing.rich_text ? undefined : product.description ?? "",
      legacy_html: existing.legacy_html ? undefined : product.description ?? "",
      content_json: existing.content_json && Object.keys(existing.content_json).length > 0 ? undefined : { format: "html", html: product.description ?? "" },
      primary_image: existing.primary_image || gallery.length === 0 ? undefined : gallery[0],
      gallery: Array.isArray(existing.gallery) && existing.gallery.length > 0 ? undefined : gallery,
      regular_price: existing.regular_price ? undefined : normalizePrice(product.prices?.regular_price),
      sale_price: existing.sale_price ? undefined : normalizePrice(product.prices?.sale_price),
      currency: existing.currency ? undefined : product.prices?.currency_code,
      price_text: existing.price_text ? undefined : product.price_html || product.prices?.price,
      stock_status: existing.stock_status ? undefined : product.stock_availability?.class ?? (product.is_in_stock ? "in-stock" : "out-of-stock"),
      category_ids: Array.isArray(existing.category_ids) && existing.category_ids.length > 0 ? undefined : categoryIds,
      source: mergeSource(existing.source, {
        siteUrl,
        sourceType: "woocommerce:product",
        sourceId: String(product.id),
        sourceSlug: product.slug,
        sourceUrl: product.permalink ?? new URL(`/product/${product.slug}/`, siteUrl).toString()
      })
    });

    if (Object.keys(patch).length === 0) {
      result.skipped.products += 1;
      continue;
    }

    const { error: updateError } = await supabase.from("products").update(patch).eq("id", existing.id);
    if (updateError) throw new Error(updateError.message);
    result.updated.products += 1;
    if (result.samples.products.length < 8) result.samples.products.push(product.slug);
  }
}

async function fetchStorePages<T>(siteUrl: string, path: string, warnings: string[]) {
  const records: T[] = [];
  const perPage = 100;
  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(path, siteUrl);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      warnings.push(`${path} returned ${response.status}.`);
      break;
    }
    const pageRecords = (await response.json()) as T[];
    records.push(...pageRecords);
    if (pageRecords.length < perPage) break;
  }
  return records;
}

async function upsertRemoteMedia(
  supabase: SupabaseClient,
  siteUrl: string,
  media: ReturnType<typeof remoteMediaValue>,
  image: StoreImage | undefined,
  sourceType: string,
  result: { updated: { media: number } }
) {
  const payload = {
    kind: "remote",
    storage_path: media.storagePath,
    public_url: media.publicUrl,
    alt: media.alt ?? null,
    title: media.title ?? null,
    source: {
      siteUrl,
      sourceType,
      sourceId: String(image?.id ?? media.publicUrl),
      sourceUrl: media.publicUrl
    }
  };
  const { error } = await supabase.from("media_assets").upsert(payload, { onConflict: "storage_path" });
  if (error) throw new Error(error.message);
  result.updated.media += 1;
}

function remoteMediaValue(url: string, title?: string, alt?: string) {
  return {
    id: url,
    kind: "remote" as const,
    sourceUrl: url,
    storagePath: url,
    publicUrl: url,
    title: title ? decodeHtml(title) : undefined,
    alt: alt ? decodeHtml(alt) : undefined
  };
}

function mergeSource(existing: unknown, next: unknown) {
  if (!existing) return next;
  const sources = Array.isArray((existing as { sources?: unknown[] }).sources)
    ? [...((existing as { sources: unknown[] }).sources)]
    : [existing];
  const key = JSON.stringify(next);
  if (!sources.some((source) => JSON.stringify(source) === key)) sources.push(next);
  return { primary: sources[0], sources };
}

function readSourceId(source: unknown): string | undefined {
  return readSourceIds(source)[0];
}

function readSourceIds(source: unknown): string[] {
  if (!source || typeof source !== "object") return [];
  const ids: string[] = [];
  const push = (value: unknown) => {
    if (value !== undefined && value !== null && value !== "") ids.push(String(value));
  };
  push((source as { sourceId?: unknown }).sourceId);
  push((source as { sourceSlug?: unknown }).sourceSlug);
  const primary = (source as { primary?: { sourceId?: unknown; sourceSlug?: unknown } }).primary;
  push(primary?.sourceId);
  push(primary?.sourceSlug);
  const sources = (source as { sources?: Array<{ sourceId?: unknown; sourceSlug?: unknown }> }).sources;
  for (const item of sources ?? []) {
    push(item.sourceId);
    push(item.sourceSlug);
  }
  return [...new Set(ids)];
}

function apiCategoryPathSlug(
  category: StoreCategory,
  categoryById: Map<number, StoreCategory>,
  mode: "slug" | "title"
) {
  const parts: string[] = [];
  let current: StoreCategory | undefined = category;
  const seen = new Set<number>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const value = mode === "slug" ? current.slug : cleanCategoryName(current.name);
    parts.unshift(slugify(decodeHtml(value)));
    current = current.parent ? categoryById.get(current.parent) : undefined;
  }
  return parts.filter(Boolean).join("-");
}

function cleanCategoryName(value: string) {
  return decodeHtml(value).replace(/^\s*-\s*/, "").trim();
}

function compact<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? decodeHtml(trimmed) : null;
}

function normalizePrice(value: string | undefined) {
  if (!value || value === "0") return null;
  return value;
}

function htmlText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#215;/g, "x")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).origin;
  } catch {
    const fallback = `https://${trimmed}`;
    try {
      return new URL(fallback).origin;
    } catch {
      return undefined;
    }
  }
}
