import type { ContentModelConfig, SiteConfig } from "@global-trade/core";
import { FrontendDataClient, validateSiteConfig } from "@global-trade/core";
import { unstable_cache } from "next/cache";
import { cacheTags, FRONTEND_REVALIDATE_SECONDS } from "./cache-tags";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "./supabase";

export const siteConfig: SiteConfig = {
  name: "Global Trade Starter",
  domain: getSiteDomain(),
  locale: "en",
  inquiryEmail: process.env.INQUIRY_TO_EMAIL ?? "sales@example.com",
  inquiryPhone: "+86 136-8588-2988",
  inquiryWhatsApp: "+86 136-8588-2988",
  defaultSeo: {
    title: "Global Trade Starter | Product Showcase",
    description: "A reusable foreign-trade showcase site powered by EdgeOne Pages and Supabase.",
    noindex: false
  },
  pageSeo: {
    home: {
      title: "INSHOW HOME | Full range customization",
      description: "B2B prefab house, building materials, and smart home product showcase."
    },
    products: {
      title: "Products | INSHOW HOME",
      description: "Explore INSHOW HOME product categories and send detailed inquiries."
    },
    news: {
      title: "News | INSHOW HOME",
      description: "Company news, product updates, and frequently asked questions from INSHOW HOME."
    },
    contact: {
      title: "Contact | INSHOW HOME",
      description: "Contact INSHOW HOME for custom product requirements and quotations."
    }
  },
  navigation: [
    { label: "Products", href: "/products" },
    { label: "News", href: "/news" },
    { label: "Contact", href: "/contact" }
  ],
  footer: [
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" }
      ]
    }
  ],
  i18n: {
    defaultLocale: "en",
    fallbackLocale: "en",
    routingStrategy: "none",
    locales: [{ code: "en", label: "English", enabled: true }]
  }
};

export async function getRuntimeSiteConfig(): Promise<SiteConfig> {
  return getCachedRuntimeSiteConfig();
}

const getCachedRuntimeSiteConfig = unstable_cache(async (): Promise<SiteConfig> => {
  if (!isSupabaseConfigured()) return siteConfig;
  try {
    const remote = await new FrontendDataClient({ supabase: createBrowserSupabaseClient() }).getSiteConfig();
    return remote ? validateSiteConfig({ ...siteConfig, ...remote }) : siteConfig;
  } catch {
    return siteConfig;
  }
}, ["runtime-site-config"], { tags: [cacheTags.siteConfig], revalidate: FRONTEND_REVALIDATE_SECONDS });

export const contentModelConfig: ContentModelConfig = {
  products: true,
  posts: true,
  pages: true,
  inquiries: true
};

function getSiteDomain() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return "https://example.com";

  try {
    return new URL(value).origin;
  } catch {
    return "https://example.com";
  }
}
