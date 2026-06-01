import type { Inquiry, Post, PostCategory, Product, ProductCategory, UserRole } from "@global-trade/core";
import { mockCategories, mockPostCategories, mockPosts, mockProducts } from "./mock-data";
import { createCookieSupabaseClient } from "./auth";
import { createServiceSupabaseClient, isSupabaseConfigured, isSupabaseServiceRoleConfigured } from "./supabase";

type AdminPost = Post & { contentJson?: unknown };
type AdminProduct = Product & { contentJson?: unknown };
type AdminProductCategory = ProductCategory & { updatedAt?: string | undefined };
type AdminPostCategory = PostCategory & { createdAt?: string; updatedAt?: string };

export type AdminInquiry = Inquiry & {
  product?: Pick<Product, "id" | "slug" | "title"> | null;
};

export interface AdminInquiryFilters {
  formType?: string | undefined;
  status?: string | undefined;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  hasAuthUser: boolean;
}

export interface AdminMediaAsset {
  id: string;
  kind: "remote" | "local";
  publicUrl: string;
  storagePath: string;
  sourceUrl: string | null;
  alt: string | null;
  title: string | null;
  caption: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

const userRoles: UserRole[] = ["owner", "admin", "editor", "sales", "viewer"];

export async function listAdminPosts(): Promise<AdminPost[]> {
  if (!isSupabaseConfigured()) return mockPosts.map(withPostContentJson);
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("posts").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map(mapPost);
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  if (!isSupabaseConfigured()) {
    const post = mockPosts.find((item) => item.id === id || item.slug === id);
    return post ? withPostContentJson(post) : null;
  }
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).single();
  if (error) return null;
  return mapPost(data);
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  if (!isSupabaseConfigured()) return mockProducts.map(withProductContentJson);
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map(mapProduct);
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  if (!isSupabaseConfigured()) {
    const product = mockProducts.find((item) => item.id === id || item.slug === id);
    return product ? withProductContentJson(product) : null;
  }
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) return null;
  return mapProduct(data);
}

export async function listAdminProductCategories(): Promise<AdminProductCategory[]> {
  if (!isSupabaseConfigured()) return mockCategories;
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("product_categories").select("*").order("title");
  if (error) throw error;
  return data.map(mapProductCategory);
}

export async function listAdminPostCategories(): Promise<AdminPostCategory[]> {
  if (!isSupabaseConfigured()) return mockPostCategories.map(mapPostCategory);
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("post_categories").select("*").order("title");
  if (error) return mockPostCategories.map(mapPostCategory);
  return data.map(mapPostCategory);
}

export async function getAdminPostCategory(id: string): Promise<AdminPostCategory | null> {
  if (!isSupabaseConfigured()) {
    return mockPostCategories.find((category) => category.id === id || category.slug === id) ?? null;
  }
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("post_categories").select("*").eq("id", id).single();
  if (error) return null;
  return mapPostCategory(data);
}

export async function listAdminMedia(): Promise<AdminMediaAsset[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    kind: row.kind ?? "remote",
    publicUrl: row.public_url,
    storagePath: row.storage_path,
    sourceUrl: row.source?.sourceUrl ?? null,
    alt: row.alt ?? null,
    title: row.title ?? null,
    caption: row.caption ?? null,
    mimeType: row.mime_type ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    createdAt: row.created_at
  }));
}

export async function listAdminInquiries(filters: AdminInquiryFilters = {}): Promise<AdminInquiry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createCookieSupabaseClient();
  let query = supabase
    .from("inquiries")
    .select("*, product:products(id,slug,title)")
    .order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.formType) query = query.eq("form_type", filters.formType);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapInquiry);
}

export async function getAdminInquiry(id: string): Promise<AdminInquiry | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*, product:products(id,slug,title)")
    .eq("id", id)
    .single();
  if (error) return null;
  return mapInquiry(data);
}

export async function getAdminProductCategory(id: string): Promise<AdminProductCategory | null> {
  if (!isSupabaseConfigured()) {
    return mockCategories.find((category) => category.id === id || category.slug === id) ?? null;
  }
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase.from("product_categories").select("*").eq("id", id).single();
  if (error) return null;
  return mapProductCategory(data);
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

  if (!isSupabaseConfigured()) {
    return [
      {
        id: "local-admin",
        email: "local@example.com",
        fullName: "Local Admin",
        role: "owner",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastSignInAt: null,
        hasAuthUser: false
      }
    ];
  }

  if (isProductionBuild) return [];

  if (isSupabaseServiceRoleConfigured()) {
    try {
      return await listAdminUsersFromAuth();
    } catch {
      try {
        return await listAdminUsersFromProfiles();
      } catch {
        return [];
      }
    }
  }

  try {
    return await listAdminUsersFromProfiles();
  } catch {
    return [];
  }
}

async function listAdminUsersFromProfiles(): Promise<AdminUser[]> {
  const supabase = await createCookieSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapProfile);
}

async function listAdminUsersFromAuth(): Promise<AdminUser[]> {
  const supabase = createServiceSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw authError;

  const ids = authData.users.map((user) => user.id);
  const profilesById = new Map<string, Record<string, any>>();

  if (ids.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,created_at,updated_at")
      .in("id", ids);
    if (profilesError) throw profilesError;
    profiles.forEach((profile) => profilesById.set(String(profile.id), profile));
  }

  return authData.users
    .map((user) => {
      const profile = profilesById.get(user.id);
    return {
        id: user.id,
        email: user.email ?? String(profile?.email ?? ""),
        fullName: String(profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? "") || null,
        role: toUserRole(profile?.role),
        createdAt: String(profile?.created_at ?? user.created_at ?? new Date().toISOString()),
        updatedAt: String(profile?.updated_at ?? user.updated_at ?? user.created_at ?? new Date().toISOString()),
        lastSignInAt: user.last_sign_in_at ?? null,
        hasAuthUser: true
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function withPostContentJson(post: Post): AdminPost {
  return {
    ...post,
    contentJson: htmlToEditorSeed(post.richText)
  };
}

function withProductContentJson(product: Product): AdminProduct {
  return {
    ...product,
    contentJson: htmlToEditorSeed(product.richText)
  };
}

function htmlToEditorSeed(html: string) {
  return { format: "html", html };
}

function mapPost(row: Record<string, any>): AdminPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    author: row.author ?? undefined,
    excerpt: row.excerpt ?? undefined,
    richText: row.rich_text ?? "",
    contentJson: row.content_json ?? undefined,
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

function mapProduct(row: Record<string, any>): AdminProduct {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    sku: row.sku ?? undefined,
    productType: row.product_type ?? undefined,
    summary: row.summary ?? undefined,
    richText: row.rich_text ?? "",
    contentJson: row.content_json ?? undefined,
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

function mapProductCategory(row: Record<string, any>): AdminProductCategory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    displayTitle: row.display_title ?? undefined,
    description: row.description ?? undefined,
    parentId: row.parent_id ?? undefined,
    image: row.image ?? undefined,
    seo: row.seo ?? undefined,
    source: row.source ?? undefined,
    updatedAt: row.updated_at
  };
}

function mapPostCategory(row: Record<string, any>): AdminPostCategory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    parentId: row.parent_id ?? undefined,
    source: row.source ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

function mapInquiry(row: Record<string, any>): AdminInquiry {
  return {
    id: row.id,
    status: row.status,
    formType: row.form_type ?? "product_inquiry",
    subject: row.subject ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    messenger: row.messenger ?? undefined,
    company: row.company ?? undefined,
    message: row.message,
    productId: row.product_id ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    payload: row.payload ?? {},
    fieldLabels: row.field_labels ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    product: row.product ?? null
  };
}

function mapProfile(row: Record<string, any>): AdminUser {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    fullName: row.full_name ? String(row.full_name) : null,
    role: toUserRole(row.role),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    lastSignInAt: null,
    hasAuthUser: false
  };
}

function toUserRole(value: unknown): UserRole {
  return userRoles.includes(value as UserRole) ? (value as UserRole) : "viewer";
}
