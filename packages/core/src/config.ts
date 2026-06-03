import { z } from "zod";
import type { ContentModelConfig, SiteConfig } from "./types";

export const navigationItemSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    children: z.array(navigationItemSchema).optional()
  })
);

export const siteConfigSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  locale: z.string().min(2),
  logoUrl: z.string().url().optional(),
  inquiryEmail: z.string().email(),
  inquiryPhone: z.string().optional(),
  inquiryWhatsApp: z.string().optional(),
  inquiryWeChat: z.string().optional(),
  defaultSeo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    canonicalUrl: z.string().url().optional(),
    ogImageUrl: z.string().url().optional(),
    noindex: z.boolean().optional()
  }),
  pageSeo: z
    .object({
      home: seoFieldsSchema().optional(),
      products: seoFieldsSchema().optional(),
      news: seoFieldsSchema().optional(),
      contact: seoFieldsSchema().optional()
    })
    .optional(),
  navigation: z.array(navigationItemSchema),
  footer: z.array(
    z.object({
      title: z.string().min(1),
      links: z.array(navigationItemSchema)
    })
  ),
  i18n: z
    .object({
      defaultLocale: z.string().min(2),
      fallbackLocale: z.string().min(2).optional(),
      routingStrategy: z.enum(["none", "path-prefix"]),
      locales: z.array(
        z.object({
          code: z.string().min(2),
          label: z.string().min(1),
          enabled: z.boolean()
        })
      )
    })
    .optional(),
  media: z
    .object({
      uploadProvider: z.enum(["supabase", "ali_oss"]),
      supabaseBucket: z.string().min(1).optional(),
      aliOss: z
        .object({
          bucket: z.string().min(1).optional(),
          region: z.string().min(1).optional(),
          endpoint: z.string().min(1).optional(),
          publicBaseUrl: z.string().url().optional(),
          pathPrefix: z.string().optional()
        })
        .optional()
    })
    .optional()
});

export const contentModelConfigSchema = z.object({
  products: z.boolean(),
  posts: z.boolean(),
  pages: z.boolean(),
  inquiries: z.boolean(),
  customFields: z
    .object({
      products: z.array(customFieldSchema()).optional(),
      posts: z.array(customFieldSchema()).optional(),
      pages: z.array(customFieldSchema()).optional(),
      inquiries: z.array(customFieldSchema()).optional()
    })
    .optional()
});

export const defaultContentModelConfig: ContentModelConfig = {
  products: true,
  posts: true,
  pages: true,
  inquiries: true
};

export function validateSiteConfig(config: SiteConfig): SiteConfig {
  return compactUndefined(siteConfigSchema.parse(config)) as SiteConfig;
}

export function validateContentModelConfig(config: ContentModelConfig): ContentModelConfig {
  return compactUndefined(contentModelConfigSchema.parse(config)) as ContentModelConfig;
}

function customFieldSchema() {
  return z.object({
    name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
    label: z.string().min(1),
    kind: z.enum(["text", "textarea", "number", "boolean", "date", "url", "select", "multiSelect", "json"]),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional()
  });
}

function seoFieldsSchema() {
  return z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    canonicalUrl: z.string().url().optional(),
    ogImageUrl: z.string().url().optional(),
    noindex: z.boolean().optional()
  });
}

function compactUndefined(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(compactUndefined);
  if (!input || typeof input !== "object") return input;

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = compactUndefined(value);
  }
  return output;
}
