import { FrontendDataClient, type Post, type Product, type ProductCategory } from "@global-trade/core";
import { unstable_cache } from "next/cache";
import { cacheTags, FRONTEND_REVALIDATE_SECONDS } from "./cache-tags";
import { mockCategories, mockPosts, mockProducts } from "./mock-data";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "./supabase";

export async function listProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return mockProducts;
  try {
    return await getCachedProducts();
  } catch {
    return [];
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return mockProducts.find((product) => product.slug === slug) ?? null;
  try {
    return await getCachedProduct(slug);
  } catch {
    return null;
  }
}

export async function listCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured()) return mockCategories;
  try {
    return await getCachedCategories();
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) return mockPosts.find((post) => post.slug === slug) ?? null;
  try {
    return await getCachedPost(slug);
  } catch {
    return null;
  }
}

export async function listPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured()) return mockPosts;
  try {
    return await getCachedPosts();
  } catch {
    return [];
  }
}

const getCachedProducts = unstable_cache(
  async () => new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).listProducts(200),
  ["products-list"],
  { tags: [cacheTags.productsList], revalidate: FRONTEND_REVALIDATE_SECONDS }
);

const getCachedCategories = unstable_cache(
  async () => new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).listCategories(),
  ["product-categories"],
  { tags: [cacheTags.productCategories], revalidate: FRONTEND_REVALIDATE_SECONDS }
);

const getCachedPosts = unstable_cache(
  async () => new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).listPosts(200),
  ["posts-list"],
  { tags: [cacheTags.postsList], revalidate: FRONTEND_REVALIDATE_SECONDS }
);

function getCachedProduct(slug: string) {
  return unstable_cache(
    async () => new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).getProductBySlug(slug),
    ["product", slug],
    { tags: [cacheTags.product(slug)], revalidate: FRONTEND_REVALIDATE_SECONDS }
  )();
}

function getCachedPost(slug: string) {
  return unstable_cache(
    async () => new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).getPostBySlug(slug),
    ["post", slug],
    { tags: [cacheTags.post(slug)], revalidate: FRONTEND_REVALIDATE_SECONDS }
  )();
}
