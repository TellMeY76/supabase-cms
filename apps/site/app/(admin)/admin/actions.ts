"use server";

import { createCookieSupabaseClient, requireAdminRole, requireAdminSession } from "@/lib/auth";
import { createServiceSupabaseClient, isSupabaseConfigured, isSupabaseServiceRoleConfigured } from "@/lib/supabase";
import { slugify, type SiteConfig, type UserRole } from "@global-trade/core";
import { redirect } from "next/navigation";
import { z } from "zod";

const statusSchema = z.enum(["draft", "published", "archived"]);
const inquiryStatusSchema = z.enum(["new", "contacted", "closed", "spam"]);
const roleSchema = z.enum(["owner", "admin", "editor", "sales", "viewer"]);
const userManagerRoles: UserRole[] = ["owner", "admin"];
type SupabaseServerClient =
  | ReturnType<typeof createServiceSupabaseClient>
  | Awaited<ReturnType<typeof createCookieSupabaseClient>>;

const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  author: z.string().optional(),
  featuredImageUrl: z.string().optional(),
  contentJson: z.string().min(1),
  contentHtml: z.string().optional(),
  categoryIds: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoCanonicalUrl: z.string().optional(),
  seoOgImageUrl: z.string().optional(),
  seoNoindex: z.string().optional(),
  status: statusSchema,
  publishedAt: z.string().optional()
});

const postCategorySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  parentId: z.string().optional()
});

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().optional(),
  productType: z.string().optional(),
  categoryIds: z.string().optional(),
  tagIds: z.string().optional(),
  summary: z.string().optional(),
  primaryImageUrl: z.string().optional(),
  specifications: z.string().optional(),
  regularPrice: z.string().optional(),
  salePrice: z.string().optional(),
  currency: z.string().optional(),
  priceText: z.string().optional(),
  stockStatus: z.string().optional(),
  stockQuantity: z.string().optional(),
  contentJson: z.string().min(1),
  contentHtml: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoCanonicalUrl: z.string().optional(),
  seoOgImageUrl: z.string().optional(),
  seoNoindex: z.string().optional(),
  status: statusSchema
});

const productCategorySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  displayTitle: z.string().optional(),
  slug: z.string().optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoCanonicalUrl: z.string().optional(),
  seoOgImageUrl: z.string().optional(),
  seoNoindex: z.string().optional()
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().optional(),
  password: z.string().min(8),
  role: roleSchema
});

const updateUserRoleSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().optional(),
  role: roleSchema
});

const deleteUserSchema = z.object({
  id: z.string().min(1)
});

const updateInquiryStatusSchema = z.object({
  id: z.string().min(1),
  status: inquiryStatusSchema,
  returnTo: z.string().optional()
});

const settingsSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  locale: z.string().min(2),
  inquiryEmail: z.string().email(),
  inquiryPhone: z.string().optional(),
  inquiryWhatsApp: z.string().optional(),
  inquiryWeChat: z.string().optional(),
  defaultSeoTitle: z.string().min(1),
  defaultSeoDescription: z.string().min(1),
  defaultSeoOgImageUrl: z.string().optional(),
  defaultSeoNoindex: z.string().optional(),
  homeSeoTitle: z.string().optional(),
  homeSeoDescription: z.string().optional(),
  productsSeoTitle: z.string().optional(),
  productsSeoDescription: z.string().optional(),
  newsSeoTitle: z.string().optional(),
  newsSeoDescription: z.string().optional(),
  contactSeoTitle: z.string().optional(),
  contactSeoDescription: z.string().optional()
});

const mediaUploadSchema = z.object({
  alt: z.string().optional(),
  title: z.string().optional()
});

export async function savePostAction(formData: FormData) {
  await requireAdminSession();
  const parsed = postSchema.parse(formEntries(formData));
  const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
  const content = JSON.parse(parsed.contentJson);
  const richText = parsed.contentHtml ?? "";
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const payload = {
    title: parsed.title,
    slug,
    status: parsed.status,
    author: emptyToNull(parsed.author),
    excerpt: emptyToNull(parsed.excerpt),
    content_json: content,
    rich_text: richText,
    category_ids: categoryIds,
    featured_image: parsed.featuredImageUrl ? { publicUrl: parsed.featuredImageUrl } : null,
    seo: {
      title: emptyToUndefined(parsed.seoTitle),
      description: emptyToUndefined(parsed.seoDescription),
      canonicalUrl: emptyToUndefined(parsed.seoCanonicalUrl),
      ogImageUrl: emptyToUndefined(parsed.seoOgImageUrl),
      noindex: parsed.seoNoindex === "on" ? true : undefined
    },
    published_at: parsed.status === "published" ? parsed.publishedAt || new Date().toISOString() : null
  };

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const query = parsed.id
      ? supabase.from("posts").update(payload).eq("id", parsed.id).select("id").single()
      : supabase.from("posts").insert(payload).select("id").single();
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  redirect("/admin/posts");
}

export async function saveProductAction(formData: FormData) {
  await requireAdminSession();
  const parsed = productSchema.parse(formEntries(formData));
  const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
  const content = JSON.parse(parsed.contentJson);
  const richText = parsed.contentHtml ?? "";
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);
  const tagIds = formData.getAll("tagIds").map(String).filter(Boolean);
  const galleryUrls = formData.getAll("galleryUrls").map(String).filter(Boolean);
  const payload = {
    title: parsed.title,
    slug,
    status: parsed.status,
    sku: emptyToNull(parsed.sku),
    product_type: emptyToNull(parsed.productType),
    summary: emptyToNull(parsed.summary),
    content_json: content,
    rich_text: richText,
    category_ids: categoryIds.length > 0 ? categoryIds : splitLines(parsed.categoryIds),
    tag_ids: tagIds.length > 0 ? tagIds : splitLines(parsed.tagIds),
    primary_image: parsed.primaryImageUrl ? remoteMediaValue(parsed.primaryImageUrl) : null,
    gallery: galleryUrls.map(remoteMediaValue),
    specifications: parseSpecifications(parsed.specifications),
    regular_price: emptyToNull(parsed.regularPrice),
    sale_price: emptyToNull(parsed.salePrice),
    currency: emptyToNull(parsed.currency),
    price_text: emptyToNull(parsed.priceText),
    stock_status: emptyToNull(parsed.stockStatus),
    stock_quantity: parsed.stockQuantity ? Number(parsed.stockQuantity) : null,
    seo: {
      title: emptyToUndefined(parsed.seoTitle),
      description: emptyToUndefined(parsed.seoDescription),
      canonicalUrl: emptyToUndefined(parsed.seoCanonicalUrl),
      ogImageUrl: emptyToUndefined(parsed.seoOgImageUrl),
      noindex: parsed.seoNoindex === "on" ? true : undefined
    }
  };

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const query = parsed.id
      ? supabase.from("products").update(payload).eq("id", parsed.id).select("id").single()
      : supabase.from("products").insert(payload).select("id").single();
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  redirect("/admin/products");
}

export async function saveProductCategoryAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const parsed = productCategorySchema.parse(formEntries(formData));
  const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
  const payload = {
    title: parsed.title,
    display_title: emptyToNull(parsed.displayTitle),
    slug,
    parent_id: emptyToNull(parsed.parentId),
    description: emptyToNull(parsed.description),
    image: parsed.imageUrl ? remoteMediaValue(parsed.imageUrl) : null,
    seo: {
      title: emptyToUndefined(parsed.seoTitle),
      description: emptyToUndefined(parsed.seoDescription),
      canonicalUrl: emptyToUndefined(parsed.seoCanonicalUrl),
      ogImageUrl: emptyToUndefined(parsed.seoOgImageUrl),
      noindex: parsed.seoNoindex === "on" ? true : undefined
    }
  };

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const query = parsed.id
      ? supabase.from("product_categories").update(payload).eq("id", parsed.id).select("id").single()
      : supabase.from("product_categories").insert(payload).select("id").single();
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  redirect("/admin/product-categories");
}

export async function savePostCategoryAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const parsed = postCategorySchema.parse(formEntries(formData));
  const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
  const payload = {
    title: parsed.title,
    slug,
    parent_id: emptyToNull(parsed.parentId)
  };

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const query = parsed.id
      ? supabase.from("post_categories").update(payload).eq("id", parsed.id).select("id").single()
      : supabase.from("post_categories").insert(payload).select("id").single();
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  redirect("/admin/post-categories");
}

export async function deletePostCategoryAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const parsed = deleteUserSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectPostCategoriesError("Please choose a valid category to delete.");

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase.from("post_categories").delete().eq("id", parsed.data.id);
    if (error) redirectPostCategoriesError(error.message);
  }

  redirectPostCategoriesSuccess("Category deleted.");
}

export async function deletePostAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const parsed = deleteUserSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectPostsError("Please choose a valid post to delete.");

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase.from("posts").delete().eq("id", parsed.data.id);
    if (error) redirectPostsError(error.message);
  }

  redirectPostsSuccess("Post deleted.");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const parsed = deleteUserSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectProductsError("Please choose a valid product to delete.");

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase.from("products").delete().eq("id", parsed.data.id);
    if (error) redirectProductsError(error.message);
  }

  redirectProductsSuccess("Product deleted.");
}

export async function updatePostStatusAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const entries = formEntries(formData);
  const id = z.string().min(1).parse(entries.id);
  const status = statusSchema.parse(entries.status);

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase
      .from("posts")
      .update({
        status,
        published_at: status === "published" ? new Date().toISOString() : null
      })
      .eq("id", id);
    if (error) redirectPostsError(error.message);
  }

  redirect("/admin/posts");
}

export async function updateProductStatusAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const entries = formEntries(formData);
  const id = z.string().min(1).parse(entries.id);
  const status = statusSchema.parse(entries.status);

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) redirectProductsError(error.message);
  }

  redirect("/admin/products");
}

export async function updateInquiryStatusAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "sales"]);
  const parsed = updateInquiryStatusSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectInquiriesError("Please choose a valid inquiry and status.");

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);
    if (error) redirectInquiriesError(error.message);
  }

  redirect(parsed.data.returnTo || `/admin/inquiries?success=${encodeURIComponent("Inquiry status updated.")}`);
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdminRole(["owner", "admin"]);
  const parsed = settingsSchema.parse(formEntries(formData));
  const value: SiteConfig = {
    name: parsed.name,
    domain: parsed.domain,
    locale: parsed.locale,
    inquiryEmail: parsed.inquiryEmail,
    inquiryPhone: emptyToUndefined(parsed.inquiryPhone),
    inquiryWhatsApp: emptyToUndefined(parsed.inquiryWhatsApp),
    inquiryWeChat: emptyToUndefined(parsed.inquiryWeChat),
    defaultSeo: {
      title: parsed.defaultSeoTitle,
      description: parsed.defaultSeoDescription,
      ogImageUrl: emptyToUndefined(parsed.defaultSeoOgImageUrl),
      noindex: parsed.defaultSeoNoindex === "on" ? true : false
    },
    pageSeo: {
      home: {
        title: emptyToUndefined(parsed.homeSeoTitle),
        description: emptyToUndefined(parsed.homeSeoDescription)
      },
      products: {
        title: emptyToUndefined(parsed.productsSeoTitle),
        description: emptyToUndefined(parsed.productsSeoDescription)
      },
      news: {
        title: emptyToUndefined(parsed.newsSeoTitle),
        description: emptyToUndefined(parsed.newsSeoDescription)
      },
      contact: {
        title: emptyToUndefined(parsed.contactSeoTitle),
        description: emptyToUndefined(parsed.contactSeoDescription)
      }
    },
    navigation: [
      { label: "Products", href: "/products" },
      { label: "News", href: "/news" },
      { label: "Contact", href: "/contact" }
    ],
    footer: []
  };

  if (isSupabaseConfigured()) {
    const supabase = await createCookieSupabaseClient();
    const { error } = await supabase.from("site_settings").upsert({ key: "site_config", value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }

  redirect("/admin/settings");
}

export async function uploadMediaAction(formData: FormData) {
  await requireAdminRole(["owner", "admin", "editor"]);
  const parsed = mediaUploadSchema.parse(formEntries(formData));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Media file is required.");
  if (!isSupabaseConfigured()) redirect("/admin/media");

  const supabase = await createCookieSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `admin/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("media").upload(storagePath, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("media").getPublicUrl(storagePath);
  const publicUrl = data.publicUrl;
  const { error } = await supabase.from("media_assets").insert({
    kind: "local",
    storage_path: storagePath,
    public_url: publicUrl,
    source: { type: "admin-upload" },
    alt: emptyToNull(parsed.alt),
    title: emptyToNull(parsed.title),
    mime_type: file.type || null
  });
  if (error) throw new Error(error.message);

  redirect("/admin/media");
}

export async function createUserAction(formData: FormData) {
  const session = await requireAdminRole(userManagerRoles);
  const parsed = createUserSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectUsersError("Please check the email, password, and role fields.");

  const role = parsed.data.role;
  if (!canManageRole(session.profile.role, role)) {
    redirectUsersError("Only owners can create another owner account.");
  }

  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    redirectUsersError("SUPABASE_SERVICE_ROLE_KEY is required to create users.");
  }

  const fullName = emptyToNull(parsed.data.fullName);
  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createServiceSupabaseClient();
  const authPayload = {
    email,
    password: parsed.data.password,
    email_confirm: true,
    ...(fullName ? { user_metadata: { full_name: fullName } } : {})
  };
  const { data, error } = await supabase.auth.admin.createUser(authPayload);
  if (error || !data.user) redirectUsersError(error?.message ?? "Unable to create user.");

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? email,
      full_name: fullName,
      role
    },
    { onConflict: "id" }
  );
  if (profileError) redirectUsersError(profileError.message);

  redirectUsersSuccess("User created.");
}

export async function updateUserRoleAction(formData: FormData) {
  const session = await requireAdminRole(userManagerRoles);
  const parsed = updateUserRoleSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectUsersError("Please check the user and role fields.");

  const supabase = isSupabaseServiceRoleConfigured() ? createServiceSupabaseClient() : await createCookieSupabaseClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.id)
    .single();
  if (targetError || !target) redirectUsersError(targetError?.message ?? "User profile was not found.");

  const currentRole = toUserRole(target.role);
  const nextRole = parsed.data.role;
  if (!canManageRole(session.profile.role, currentRole) || !canManageRole(session.profile.role, nextRole)) {
    redirectUsersError("Only owners can manage owner accounts.");
  }

  if (parsed.data.id === session.user.id && nextRole !== session.profile.role) {
    redirectUsersError("You cannot change your own role.");
  }

  if (currentRole === "owner" && nextRole !== "owner") {
    await ensureAnotherOwner(supabase, parsed.data.id);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: emptyToNull(parsed.data.fullName),
      role: nextRole
    })
    .eq("id", parsed.data.id)
    .select("id")
    .single();
  if (error) redirectUsersError(error.message);

  redirectUsersSuccess("User permissions updated.");
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireAdminRole(userManagerRoles);
  const parsed = deleteUserSchema.safeParse(formEntries(formData));
  if (!parsed.success) redirectUsersError("Please choose a valid user to delete.");

  if (parsed.data.id === session.user.id) {
    redirectUsersError("You cannot delete your own account.");
  }

  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    redirectUsersError("SUPABASE_SERVICE_ROLE_KEY is required to delete users.");
  }

  const supabase = createServiceSupabaseClient();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.id)
    .single();
  if (targetError || !target) redirectUsersError(targetError?.message ?? "User profile was not found.");

  const currentRole = toUserRole(target.role);
  if (!canManageRole(session.profile.role, currentRole)) {
    redirectUsersError("Only owners can delete owner accounts.");
  }

  if (currentRole === "owner") {
    await ensureAnotherOwner(supabase, parsed.data.id);
  }

  const { error } = await supabase.auth.admin.deleteUser(parsed.data.id);
  if (error) redirectUsersError(error.message);

  redirectUsersSuccess("User deleted.");
}

function formEntries(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function emptyToNull(value?: string) {
  return value?.trim() ? value.trim() : null;
}

function emptyToUndefined(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}

function splitLines(value?: string) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSpecifications(value?: string) {
  return splitLines(value).map((line) => {
    const [name, ...rest] = line.split(":");
    return {
      name: name?.trim() || "Specification",
      value: rest.join(":").trim()
    };
  });
}

function remoteMediaValue(url: string) {
  return {
    kind: "remote",
    sourceUrl: url,
    storagePath: url,
    publicUrl: url
  };
}

function canManageRole(actorRole: UserRole, targetRole: UserRole) {
  return actorRole === "owner" || targetRole !== "owner";
}

async function ensureAnotherOwner(supabase: SupabaseServerClient, userId: string) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .neq("id", userId);
  if (error) redirectUsersError(error.message);
  if (!count) redirectUsersError("At least one owner account must remain.");
}

function toUserRole(value: unknown): UserRole {
  return roleSchema.options.includes(value as UserRole) ? (value as UserRole) : "viewer";
}

function redirectUsersError(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

function redirectUsersSuccess(message: string): never {
  redirect(`/admin/users?success=${encodeURIComponent(message)}`);
}

function redirectPostsError(message: string): never {
  redirect(`/admin/posts?error=${encodeURIComponent(message)}`);
}

function redirectPostsSuccess(message: string): never {
  redirect(`/admin/posts?success=${encodeURIComponent(message)}`);
}

function redirectProductsError(message: string): never {
  redirect(`/admin/products?error=${encodeURIComponent(message)}`);
}

function redirectProductsSuccess(message: string): never {
  redirect(`/admin/products?success=${encodeURIComponent(message)}`);
}

function redirectInquiriesError(message: string): never {
  redirect(`/admin/inquiries?error=${encodeURIComponent(message)}`);
}

function redirectPostCategoriesError(message: string): never {
  redirect(`/admin/post-categories?error=${encodeURIComponent(message)}`);
}

function redirectPostCategoriesSuccess(message: string): never {
  redirect(`/admin/post-categories?success=${encodeURIComponent(message)}`);
}
