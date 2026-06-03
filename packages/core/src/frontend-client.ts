import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page, Post, Product, ProductCategory, SiteConfig } from "./types";

type DatabaseRow = Record<string, unknown>;

export interface FrontendDataClientOptions {
  supabase: SupabaseClient;
}

export class FrontendDataClient {
  private readonly supabase: SupabaseClient;

  constructor(options: FrontendDataClientOptions) {
    this.supabase = options.supabase;
  }

  async getSiteConfig(): Promise<SiteConfig | null> {
    const { data, error } = await this.supabase.from("site_settings").select("value").eq("key", "site_config").single();
    if (error) return null;
    return data?.value as SiteConfig;
  }

  async listProducts(limit = 24): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapProduct);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return mapProduct(data);
  }

  async listCategories(): Promise<ProductCategory[]> {
    const { data, error } = await this.supabase.from("product_categories").select("*").order("title");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      displayTitle: row.display_title ?? undefined,
      description: row.description ?? undefined,
      parentId: row.parent_id ?? undefined,
      image: row.image ?? undefined,
      seo: row.seo ?? undefined,
      source: row.source ?? undefined
    }));
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    const { data, error } = await this.supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return mapPost(data);
  }

  async listPosts(limit = 24): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapPost);
  }

  async getPageBySlug(slug: string): Promise<Page | null> {
    const { data, error } = await this.supabase
      .from("pages")
      .select("*")
      .eq("status", "published")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return mapPage(data);
  }
}

function mapProduct(row: DatabaseRow): Product {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    title: stringValue(row.title),
    status: stringValue(row.status) as Product["status"],
    sku: optionalString(row.sku),
    productType: optionalString(row.product_type),
    summary: optionalString(row.summary),
    richText: optionalString(row.rich_text) ?? "",
    legacyHtml: optionalString(row.legacy_html),
    categoryIds: stringArray(row.category_ids),
    tagIds: stringArray(row.tag_ids),
    primaryImage: objectValue(row.primary_image) as Product["primaryImage"],
    gallery: arrayValue(row.gallery) as Product["gallery"],
    specifications: arrayValue(row.specifications) as Product["specifications"],
    regularPrice: optionalString(row.regular_price),
    salePrice: optionalString(row.sale_price),
    currency: optionalString(row.currency),
    priceText: optionalString(row.price_text),
    stockStatus: optionalString(row.stock_status),
    stockQuantity: typeof row.stock_quantity === "number" ? row.stock_quantity : undefined,
    legacyMeta: objectValue(row.legacy_meta),
    seo: objectValue(row.seo) as Product["seo"],
    source: objectValue(row.source) as Product["source"],
    updatedAt: stringValue(row.updated_at)
  };
}

function mapPost(row: DatabaseRow): Post {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    title: stringValue(row.title),
    status: stringValue(row.status) as Post["status"],
    author: optionalString(row.author),
    excerpt: optionalString(row.excerpt),
    richText: optionalString(row.rich_text) ?? "",
    publishedAt: optionalString(row.published_at),
    modifiedAt: optionalString(row.modified_at),
    categoryIds: stringArray(row.category_ids),
    tagIds: stringArray(row.tag_ids),
    featuredImage: objectValue(row.featured_image) as Post["featuredImage"],
    seo: objectValue(row.seo) as Post["seo"],
    source: objectValue(row.source) as Post["source"],
    updatedAt: stringValue(row.updated_at)
  };
}

function mapPage(row: DatabaseRow): Page {
  return {
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    title: stringValue(row.title),
    status: stringValue(row.status) as Page["status"],
    richText: optionalString(row.rich_text) ?? "",
    seo: objectValue(row.seo) as Page["seo"],
    source: objectValue(row.source) as Page["source"],
    updatedAt: stringValue(row.updated_at)
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
