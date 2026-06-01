import { slugify, type PublishStatus } from "@global-trade/core";
import { XMLParser } from "fast-xml-parser";
import { extractWordPressMediaUrls } from "../adapters/media";
import { mapSeo } from "../adapters/seo";
import type { MigrationEntity, MigrationWarning } from "../types";

export interface ParsedWxr {
  entities: MigrationEntity[];
  warnings: MigrationWarning[];
  detectedSeoPlugins: string[];
}

interface WxrItem {
  title?: WxrText;
  link?: WxrText;
  pubDate?: WxrText;
  "content:encoded"?: WxrText;
  "excerpt:encoded"?: WxrText;
  "wp:post_id"?: number | string;
  "wp:post_name"?: WxrText;
  "wp:post_type"?: WxrText;
  "wp:status"?: WxrText;
  "wp:post_date"?: WxrText;
  "wp:post_date_gmt"?: WxrText;
  "wp:post_modified"?: WxrText;
  "wp:post_modified_gmt"?: WxrText;
  "wp:creator"?: WxrText;
  "wp:attachment_url"?: WxrText;
  "wp:postmeta"?: WxrMeta | WxrMeta[];
  category?: WxrCategory | WxrCategory[];
}

interface WxrMeta {
  "wp:meta_key"?: WxrText;
  "wp:meta_value"?: WxrText;
}

interface WxrCategory {
  "@_domain"?: string;
  "@_nicename"?: string;
  "#text"?: WxrText;
}

type WxrText = string | number | { "#text"?: WxrText } | WxrText[];

export function parseWordPressWxr(xml: string, sourceSiteUrl: string): ParsedWxr {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "#text",
    trimValues: false,
    parseTagValue: false
  });
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items: WxrItem[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const entities: MigrationEntity[] = [];
  const warnings: MigrationWarning[] = [];
  const detectedSeoPlugins = new Set<string>();

  for (const item of items) {
    const postType = textValue(item["wp:post_type"]);
    if (!postType) continue;
    if (!isImportablePostType(postType)) continue;

    const itemLink = textValue(item.link);
    const itemTitle = textValue(item.title);
    const postName = textValue(item["wp:post_name"]);
    const sourceId = String(item["wp:post_id"] ?? itemLink ?? itemTitle ?? cryptoRandomFallback());
    const source = compactUndefined({
      siteUrl: sourceSiteUrl,
      sourceType: `wordpress:${postType}`,
      sourceId,
      sourceSlug: postName || undefined,
      sourceUrl: itemLink
    });

    if (postType === "attachment") {
      const sourceUrl = textValue(item["wp:attachment_url"]) ?? itemLink;
      if (sourceUrl) {
        entities.push({
          kind: "media",
          source,
          data: compactUndefined({
            sourceUrl,
            title: itemTitle
          })
        });
      }
      continue;
    }

    const meta = normalizeMeta(item["wp:postmeta"]);
    const { pluginId, seo } = mapSeo(meta);
    if (pluginId) detectedSeoPlugins.add(pluginId);

    const status: PublishStatus = textValue(item["wp:status"]) === "publish" ? "published" : "draft";
    const richText = textValue(item["content:encoded"]) ?? "";
    const taxonomies = normalizeCategories(item.category);
    const postCategoryIds: string[] = [];
    const postTagIds: string[] = [];
    const categoryDomains = postCategoryDomains(postType);

    for (const category of taxonomies.filter((row) => categoryDomains.includes(row.domain))) {
      const slug = category.slug || slugify(category.title);
      postCategoryIds.push(slug);
      const sourceType = `wordpress:${category.domain}`;
      entities.push({
        kind: "postCategory",
        source: {
          siteUrl: sourceSiteUrl,
          sourceType,
          sourceId: slug,
          sourceSlug: slug,
          sourceUrl: categorySourceUrl(category.domain, slug, sourceSiteUrl)
        },
        data: {
          slug,
          title: category.title,
          source: {
            siteUrl: sourceSiteUrl,
            sourceType,
            sourceId: slug,
            sourceSlug: slug,
            sourceUrl: categorySourceUrl(category.domain, slug, sourceSiteUrl)
          }
        }
      });
    }

    for (const tag of taxonomies.filter((row) => row.domain === "post_tag")) {
      const slug = tag.slug || slugify(tag.title);
      postTagIds.push(slug);
      entities.push({
        kind: "postTag",
        source: {
          siteUrl: sourceSiteUrl,
          sourceType: "wordpress:post-tag",
          sourceId: slug,
          sourceSlug: slug,
          sourceUrl: new URL(`/tag/${slug}/`, sourceSiteUrl).toString()
        },
        data: {
          slug,
          title: tag.title,
          source: {
            siteUrl: sourceSiteUrl,
            sourceType: "wordpress:post-tag",
            sourceId: slug,
            sourceSlug: slug,
            sourceUrl: new URL(`/tag/${slug}/`, sourceSiteUrl).toString()
          }
        }
      });
    }

    const mediaUrls = extractWordPressMediaUrls(richText, sourceSiteUrl);
    for (const mediaUrl of mediaUrls) {
      entities.push({
        kind: "media",
        source: {
          siteUrl: sourceSiteUrl,
          sourceType: "wordpress:embedded-media",
          sourceId: mediaUrl,
          sourceUrl: mediaUrl
        },
        data: {
          sourceUrl: mediaUrl
        }
      });
    }

    const base = {
      slug: postName || slugify(itemTitle ?? sourceId),
      title: itemTitle ?? "Untitled",
      status,
      richText,
      seo,
      source
    };

    if (postType !== "page") {
      entities.push({
        kind: "post",
        source,
        data: compactUndefined({
          ...base,
          author: textValue(item["wp:creator"]) || undefined,
          excerpt: textValue(item["excerpt:encoded"]) || undefined,
          publishedAt: parseDate(textValue(item.pubDate) ?? textValue(item["wp:post_date_gmt"]) ?? textValue(item["wp:post_date"])),
          modifiedAt: parseDate(textValue(item["wp:post_modified_gmt"]) ?? textValue(item["wp:post_modified"])),
          categoryIds: postCategoryIds,
          tagIds: postTagIds
        })
      });
    } else {
      entities.push({
        kind: "page",
        source,
        data: base
      });
    }
  }

  if (items.length === 0) {
    warnings.push({
      code: "wxr.empty",
      message: "No WordPress items were detected in the XML file.",
      severity: "warning"
    });
  }

  return {
    entities,
    warnings,
    detectedSeoPlugins: [...detectedSeoPlugins]
  };
}

function isImportablePostType(postType: string) {
  return ["post", "page", "attachment", "news", "faqs"].includes(postType);
}

function postCategoryDomains(postType: string) {
  if (postType === "news") return ["news_categories", "category"];
  if (postType === "faqs") return ["faqs_categories", "category"];
  return ["category"];
}

function categorySourceUrl(domain: string, slug: string, sourceSiteUrl: string) {
  if (domain === "news_categories") return new URL(`/news_categories/${slug}/`, sourceSiteUrl).toString();
  if (domain === "faqs_categories") return new URL(`/faqs_categories/${slug}/`, sourceSiteUrl).toString();
  return new URL(`/category/${slug}/`, sourceSiteUrl).toString();
}

function normalizeCategories(input: WxrCategory | WxrCategory[] | undefined): Array<{ domain: string; slug: string; title: string }> {
  const rows = Array.isArray(input) ? input : input ? [input] : [];
  return rows
    .map((row) => ({
      domain: row["@_domain"] ?? "",
      slug: row["@_nicename"] ?? "",
      title: textValue(row["#text"]) ?? row["@_nicename"] ?? ""
    }))
    .filter((row) => row.domain && row.title);
}

function parseDate(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeMeta(input: WxrMeta | WxrMeta[] | undefined): Record<string, string> {
  const rows = Array.isArray(input) ? input : input ? [input] : [];
  const output: Record<string, string> = {};
  for (const row of rows) {
    const key = textValue(row["wp:meta_key"]);
    if (!key) continue;
    output[key] = textValue(row["wp:meta_value"]) ?? "";
  }
  return output;
}

function textValue(input: WxrText | undefined): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (Array.isArray(input)) return textValue(input[0]);
  if (typeof input === "object") return textValue(input["#text"]);
  return String(input);
}

function cryptoRandomFallback(): string {
  return Math.random().toString(36).slice(2);
}

function compactUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}
