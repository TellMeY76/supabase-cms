import type { SupabaseClient } from "@supabase/supabase-js";
import type { Page, Post, Product, ProductCategory, SiteConfig } from "./types";

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

function mapProduct(row: Record<string, any>): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    sku: row.sku ?? undefined,
    productType: row.product_type ?? undefined,
    summary: row.summary ?? undefined,
    richText: row.rich_text ?? "",
    legacyHtml: row.legacy_html ?? undefined,
    categoryIds: row.category_ids ?? [],
    tagIds: row.tag_ids ?? [],
    primaryImage: row.primary_image ?? undefined,
    gallery: row.gallery ?? [],
    specifications: row.specifications ?? [],
    regularPrice: row.regular_price ?? undefined,
    salePrice: row.sale_price ?? undefined,
    currency: row.currency ?? undefined,
    priceText: row.price_text ?? undefined,
    stockStatus: row.stock_status ?? undefined,
    stockQuantity: row.stock_quantity ?? undefined,
    legacyMeta: row.legacy_meta ?? undefined,
    seo: row.seo ?? undefined,
    source: row.source ?? undefined,
    updatedAt: row.updated_at
  };
}

function mapPost(row: Record<string, any>): Post {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    author: row.author ?? undefined,
    excerpt: row.excerpt ?? undefined,
    richText: row.rich_text ?? "",
    publishedAt: row.published_at ?? undefined,
    modifiedAt: row.modified_at ?? undefined,
    categoryIds: row.category_ids ?? [],
    tagIds: row.tag_ids ?? [],
    featuredImage: row.featured_image ?? undefined,
    seo: row.seo ?? undefined,
    source: row.source ?? undefined,
    updatedAt: row.updated_at
  };
}

function mapPage(row: Record<string, any>): Page {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    richText: row.rich_text ?? "",
    seo: row.seo ?? undefined,
    source: row.source ?? undefined,
    updatedAt: row.updated_at
  };
}
