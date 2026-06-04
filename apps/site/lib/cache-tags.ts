import { revalidatePath, revalidateTag } from "next/cache";

export const FRONTEND_REVALIDATE_SECONDS = 300;

export const cacheTags = {
  siteConfig: "site-config",
  productCategories: "product-categories",
  productsList: "products:list",
  product: (slug: string) => `product:${slug}`,
  postsList: "posts:list",
  post: (slug: string) => `post:${slug}`
};

export function revalidateProductCache(slug?: string | null) {
  revalidateTag(cacheTags.productsList);
  revalidateTag(cacheTags.productCategories);
  if (slug) {
    revalidateTag(cacheTags.product(slug));
    revalidatePath(`/products/${slug}`);
  }
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/product-category/[...slug]", "page");
  revalidatePath("/sitemap.xml");
}

export function revalidateProductCategoryCache() {
  revalidateTag(cacheTags.productCategories);
  revalidateTag(cacheTags.productsList);
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/product-category/[...slug]", "page");
  revalidatePath("/sitemap.xml");
}

export function revalidatePostCache(slug?: string | null) {
  revalidateTag(cacheTags.postsList);
  if (slug) {
    revalidateTag(cacheTags.post(slug));
    revalidatePath(`/news/${slug}`);
  }
  revalidatePath("/news");
  revalidatePath("/sitemap.xml");
}

export function revalidateSiteConfigCache() {
  revalidateTag(cacheTags.siteConfig);
  revalidatePath("/", "layout");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
}

export function revalidateFrontendCache() {
  revalidateTag(cacheTags.siteConfig);
  revalidateTag(cacheTags.productCategories);
  revalidateTag(cacheTags.productsList);
  revalidateTag(cacheTags.postsList);
  revalidatePath("/", "layout");
  revalidatePath("/product-category/[...slug]", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/news/[slug]", "page");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
}
