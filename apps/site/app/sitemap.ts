import type { MetadataRoute } from "next";
import { listProducts, listPosts } from "@/lib/data";
import { getRuntimeSiteConfig } from "@/lib/site-config";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([listProducts(), listPosts()]);
  const siteConfig = await getRuntimeSiteConfig();
  const base = siteConfig.domain.replace(/\/$/, "");
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/products`, priority: 0.8 },
    { url: `${base}/contact`, priority: 0.6 },
    ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: product.updatedAt, priority: 0.8 })),
    ...posts.map((post) => ({ url: `${base}/news/${post.slug}`, lastModified: post.updatedAt, priority: 0.6 }))
  ];
}
