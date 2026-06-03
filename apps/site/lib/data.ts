import { FrontendDataClient, type Post, type Product, type ProductCategory } from "@global-trade/core";
import { mockCategories, mockPosts, mockProducts } from "./mock-data";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "./supabase";

export async function listProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return mockProducts;
  try {
    return await new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).listProducts(200);
  } catch {
    return [];
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return mockProducts.find((product) => product.slug === slug) ?? null;
  try {
    return await new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).getProductBySlug(slug);
  } catch {
    return null;
  }
}

export async function listCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured()) return mockCategories;
  try {
    return await new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).listCategories();
  } catch {
    return [];
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) return mockPosts.find((post) => post.slug === slug) ?? null;
  try {
    return await new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).getPostBySlug(slug);
  } catch {
    return null;
  }
}

export async function listPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured()) return mockPosts;
  try {
    return await new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).listPosts(200);
  } catch {
    return [];
  }
}
