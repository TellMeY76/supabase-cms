import type { MetadataRoute } from "next";
import { getRuntimeSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteConfig = await getRuntimeSiteConfig();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"]
      }
    ],
    sitemap: `${siteConfig.domain.replace(/\/$/, "")}/sitemap.xml`
  };
}
