import { slugify } from "@global-trade/core";
import { parse } from "csv-parse/sync";
import { extractWordPressMediaUrls } from "../adapters/media";
import { mapSeo } from "../adapters/seo";
import type { MigrationEntity, MigrationWarning } from "../types";

export interface ParsedWooCommerceCsv {
  entities: MigrationEntity[];
  warnings: MigrationWarning[];
  detectedSeoPlugins: string[];
}

export function parseWooCommerceProductsCsv(csv: string, sourceSiteUrl: string): ParsedWooCommerceCsv {
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true
  }) as Record<string, string>[];

  const entities: MigrationEntity[] = [];
  const warnings: MigrationWarning[] = [];
  const detectedSeoPlugins = new Set<string>();
  const categorySlugs = new Map<string, { title: string; parentId?: string | undefined }>();
  const tagSlugs = new Set<string>();

  if (looksLikeProductCategoryExport(records)) {
    for (const record of records) {
      const name = value(record.Name) ?? value(record.name) ?? value(record.Title) ?? value(record.title);
      if (!name) continue;
      const slug = value(record.Slug) ?? value(record.slug) ?? slugify(name);
      const parentSlug = value(record.Parent) ?? value(record.parent);
      const thumbnail = firstUrl(value(record.Thumbnail) ?? value(record.thumbnail) ?? value(record.Image) ?? value(record.image));
      const thumbnailUrl = thumbnail ? new URL(thumbnail, sourceSiteUrl).toString() : undefined;
      const source = {
        siteUrl: sourceSiteUrl,
        sourceType: "woocommerce:product-category",
        sourceId: value(record.ID) ?? value(record.id) ?? slug,
        sourceSlug: slug,
        sourceUrl: new URL(`/product-category/${slug}/`, sourceSiteUrl).toString()
      };

      if (thumbnailUrl) {
        entities.push({
          kind: "media",
          source: {
            siteUrl: sourceSiteUrl,
            sourceType: "woocommerce:category-thumbnail",
            sourceId: thumbnailUrl,
            sourceUrl: thumbnailUrl
          },
          data: {
            sourceUrl: thumbnailUrl,
            title: name
          }
        });
      }

      entities.push({
        kind: "productCategory",
        source,
        data: compactUndefined({
          slug,
          title: name,
          displayTitle: name.replace(/^-\s*/, ""),
          description: value(record.Description) ?? value(record.description) ?? "",
          parentId: parentSlug ? slugify(parentSlug) : undefined,
          image: thumbnailUrl
            ? {
                id: thumbnailUrl,
                kind: "remote",
                sourceUrl: thumbnailUrl,
                storagePath: thumbnailUrl,
                publicUrl: thumbnailUrl,
                title: name
              }
            : undefined,
          source
        })
      });
    }

    return {
      entities,
      warnings,
      detectedSeoPlugins: [...detectedSeoPlugins]
    };
  }

  for (const record of records) {
    const sourceId = value(record.ID) ?? value(record.id) ?? value(record.SKU) ?? value(record.Name) ?? cryptoRandomFallback();
    const name = value(record.Name) ?? value(record.name) ?? "Untitled product";
    const slug = value(record.Slug) ?? value(record.slug) ?? slugify(name);
    const source = {
      siteUrl: sourceSiteUrl,
      sourceType: "woocommerce:product",
      sourceId,
      sourceSlug: slug,
      sourceUrl: new URL(`/product/${slug}/`, sourceSiteUrl).toString()
    };

    const categories = parseCategoryPaths(value(record.Categories) ?? value(record.categories));
    const productCategoryIds: string[] = [];
    for (const categoryPath of categories) {
      for (const category of categoryPath) {
        if (!categorySlugs.has(category.slug)) {
          categorySlugs.set(category.slug, { title: category.title, parentId: category.parentId });
          const categoryData = compactUndefined({
            slug: category.slug,
            title: category.title,
            displayTitle: category.title.replace(/^-\s*/, ""),
            description: "",
            parentId: category.parentId
          });
          entities.push({
            kind: "productCategory",
            source: {
              siteUrl: sourceSiteUrl,
              sourceType: "woocommerce:product-category",
              sourceId: category.slug,
              sourceSlug: category.slug,
              sourceUrl: new URL(`/product-category/${category.slug}/`, sourceSiteUrl).toString()
            },
            data: categoryData
          });
        }
      }

      const leaf = categoryPath.at(-1);
      if (leaf && !productCategoryIds.includes(leaf.slug)) {
        productCategoryIds.push(leaf.slug);
      }
    }

    const meta = extractMetaColumns(record);
    const { pluginId, seo } = mapSeo(meta);
    if (pluginId) detectedSeoPlugins.add(pluginId);

    const description = value(record.Description) ?? value(record.description) ?? "";
    const shortDescription = value(record["Short description"]) ?? value(record.short_description);
    const images = splitList(value(record.Images) ?? value(record.images)).map((image) => new URL(image, sourceSiteUrl).toString());
    const tags = splitList(value(record.Tags) ?? value(record.tags));
    const productTagIds: string[] = [];
    for (const tagTitle of tags) {
      const tagSlug = slugify(tagTitle);
      productTagIds.push(tagSlug);
      if (tagSlugs.has(tagSlug)) continue;
      tagSlugs.add(tagSlug);
      entities.push({
        kind: "productTag",
        source: {
          siteUrl: sourceSiteUrl,
          sourceType: "woocommerce:product-tag",
          sourceId: tagSlug,
          sourceSlug: tagSlug,
          sourceUrl: new URL(`/product-tag/${tagSlug}/`, sourceSiteUrl).toString()
        },
        data: {
          slug: tagSlug,
          title: tagTitle,
          source: {
            siteUrl: sourceSiteUrl,
            sourceType: "woocommerce:product-tag",
            sourceId: tagSlug,
            sourceSlug: tagSlug,
            sourceUrl: new URL(`/product-tag/${tagSlug}/`, sourceSiteUrl).toString()
          }
        }
      });
    }

    for (const image of images) {
      entities.push({
        kind: "media",
        source: {
          siteUrl: sourceSiteUrl,
          sourceType: "woocommerce:product-image",
          sourceId: image,
          sourceUrl: image
        },
        data: {
          sourceUrl: image,
          title: name
        }
      });
    }

    for (const embedded of extractWordPressMediaUrls(description, sourceSiteUrl)) {
      entities.push({
        kind: "media",
        source: {
          siteUrl: sourceSiteUrl,
          sourceType: "woocommerce:embedded-media",
          sourceId: embedded,
          sourceUrl: embedded
        },
        data: { sourceUrl: embedded }
      });
    }

    entities.push({
      kind: "product",
      source,
      data: compactUndefined({
        slug,
        title: name,
        status: normalizeStatus(value(record.Published)),
        sku: value(record.SKU) ?? value(record.sku),
        productType: value(record.Type) ?? value(record.type) ?? "simple",
        summary: shortDescription || undefined,
        richText: description,
        legacyHtml: description,
        categoryIds: productCategoryIds,
        tagIds: productTagIds,
        specifications: extractSpecifications(description, record),
        primaryImage: images[0]
          ? {
              id: images[0],
              kind: "remote",
              sourceUrl: images[0],
              storagePath: images[0],
              publicUrl: images[0],
              title: name
            }
          : undefined,
        gallery: images.map((image) => ({
          id: image,
          kind: "remote",
          sourceUrl: image,
          storagePath: image,
          publicUrl: image,
          title: name
        })),
        regularPrice: value(record["Regular price"]) ?? value(record.regular_price),
        salePrice: value(record["Sale price"]) ?? value(record.sale_price),
        currency: value(record.Currency) ?? value(record.currency),
        priceText: value(record.Price) ?? value(record.price),
        stockStatus: value(record["In stock?"]) ?? value(record.stock_status),
        stockQuantity: numberValue(value(record.Stock) ?? value(record.stock)),
        legacyMeta: extractLegacyMeta(record),
        seo,
        source
      })
    });
  }

  if (records.length === 0) {
    warnings.push({
      code: "woocommerce.empty_csv",
      message: "No WooCommerce product rows were detected in the CSV file.",
      severity: "warning"
    });
  }

  return {
    entities,
    warnings,
    detectedSeoPlugins: [...detectedSeoPlugins]
  };
}

interface ParsedCategory {
  title: string;
  slug: string;
  parentId?: string | undefined;
}

function parseCategoryPaths(input: string | undefined): ParsedCategory[][] {
  return splitList(input).map((path) => {
    const segments = path
      .split(">")
      .map((segment) => segment.trim())
      .filter(Boolean);
    return segments.map((title, index) => {
      const pathSlug = segments
        .slice(0, index + 1)
        .map((segment) => slugify(segment))
        .join("-");
      const parentId =
        index > 0
          ? segments
              .slice(0, index)
              .map((segment) => slugify(segment))
              .join("-")
          : undefined;
      return {
        title,
        slug: pathSlug,
        parentId
      };
    });
  });
}

function value(input: string | undefined): string | undefined {
  const trimmed = input?.trim();
  return trimmed ? trimmed : undefined;
}

function splitList(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const match = input.match(/https?:\/\/[^\s,]+/i);
  return match?.[0] ?? input.split(",").map((item) => item.trim()).find(Boolean);
}

function looksLikeProductCategoryExport(records: Record<string, string>[]): boolean {
  const first = records[0];
  if (!first) return false;
  const keys = new Set(Object.keys(first).map((key) => key.toLowerCase()));
  return keys.has("thumbnail") && keys.has("name") && !keys.has("published") && !keys.has("images");
}

function normalizeStatus(published: string | undefined) {
  return published === "1" || published?.toLowerCase() === "published" ? "published" : "draft";
}

function extractMetaColumns(record: Record<string, string>): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const [key, cell] of Object.entries(record)) {
    const normalized = key.replace(/^Meta:\s*/i, "").trim();
    if (normalized !== key || normalized.startsWith("_yoast") || normalized.startsWith("rank_math")) {
      meta[normalized] = cell;
    }
  }
  return meta;
}

function extractLegacyMeta(record: Record<string, string>): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const [key, cell] of Object.entries(record)) {
    if (key.startsWith("Meta:") || key.startsWith("Attribute ") || key.startsWith("Download ")) {
      meta[key] = cell;
    }
  }
  return meta;
}

function extractSpecifications(description: string, record: Record<string, string>) {
  const specs: Array<{ name: string; value: string; group?: string }> = [];
  for (const [key, cell] of Object.entries(record)) {
    if (!/^Attribute \d+ name$/i.test(key)) continue;
    const index = key.match(/\d+/)?.[0];
    if (!index) continue;
    const name = value(cell);
    const specValue = value(record[`Attribute ${index} value(s)`]);
    if (name && specValue) specs.push({ name, value: specValue, group: "Attributes" });
  }

  const tableMatches = description.matchAll(/<tr[^>]*>\s*<t[dh][^>]*>(.*?)<\/t[dh]>\s*<t[dh][^>]*>(.*?)<\/t[dh]>/gis);
  for (const match of tableMatches) {
    const name = stripHtml(match[1] ?? "");
    const specValue = stripHtml(match[2] ?? "");
    if (name && specValue) specs.push({ name, value: specValue, group: "Imported table" });
  }

  return specs;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function numberValue(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cryptoRandomFallback(): string {
  return Math.random().toString(36).slice(2);
}

function compactUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}
