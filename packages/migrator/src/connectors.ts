import { parseWordPressWxr } from "./wordpress/wxr";
import { parseWooCommerceProductsCsv } from "./woocommerce/csv";
import type { MigrationConnector, MigrationContext, MigrationEntity, MigrationEntityKind } from "./types";

export const wordpressWooCommerceConnector: MigrationConnector = {
  id: "wordpress-woocommerce",
  label: "WordPress + WooCommerce",
  detect(context) {
    return context.files.some((file) => looksLikeWxr(file.text)) || context.files.some((file) => looksLikeWooCsv(file.text));
  },
  async preview(context) {
    const entities = await this.map(context);
    const counts = countEntities(entities);
    const detectedSeoPlugins = new Set<string>();
    const warnings = [];

    for (const file of context.files) {
      if (looksLikeWxr(file.text)) {
        const result = parseWordPressWxr(file.text, context.sourceSiteUrl);
        result.detectedSeoPlugins.forEach((plugin) => detectedSeoPlugins.add(plugin));
        warnings.push(...result.warnings);
      }
      if (looksLikeWooCsv(file.text)) {
        const result = parseWooCommerceProductsCsv(file.text, context.sourceSiteUrl);
        result.detectedSeoPlugins.forEach((plugin) => detectedSeoPlugins.add(plugin));
        warnings.push(...result.warnings);
      }
    }

    return {
      connector: this.id,
      counts,
      warnings,
      samples: entities.slice(0, 10),
      detectedSeoPlugins: [...detectedSeoPlugins],
      sourceTotals: await fetchWordPressTotals(context.sourceSiteUrl),
      requiredActions: warnings.some((warning) => warning.severity === "error") ? ["Resolve blocking errors"] : []
    };
  },
  async map(context) {
    const entities: MigrationEntity[] = [];
    for (const file of context.files) {
      if (looksLikeWxr(file.text)) {
        entities.push(...parseWordPressWxr(file.text, context.sourceSiteUrl).entities);
      } else if (looksLikeWooCsv(file.text)) {
        entities.push(...parseWooCommerceProductsCsv(file.text, context.sourceSiteUrl).entities);
      }
    }
    return dedupeEntities(entities);
  }
};

export const defaultConnectors = [wordpressWooCommerceConnector];

export async function detectConnector(context: MigrationContext, connectors = defaultConnectors) {
  for (const connector of connectors) {
    if (await connector.detect(context)) return connector;
  }
  return null;
}

async function fetchWordPressTotals(sourceSiteUrl: string): Promise<Record<string, number> | undefined> {
  if (!sourceSiteUrl.includes("inshowhome.com")) return undefined;
  const endpoints = {
    product: "/wp-json/wp/v2/product?per_page=1",
    post: "/wp-json/wp/v2/posts?per_page=1",
    page: "/wp-json/wp/v2/pages?per_page=1",
    media: "/wp-json/wp/v2/media?per_page=1"
  };
  const totals: Record<string, number> = {};
  try {
    await Promise.all(
      Object.entries(endpoints).map(async ([key, path]) => {
        const response = await fetch(new URL(path, sourceSiteUrl), { method: "HEAD" });
        const total = Number(response.headers.get("x-wp-total"));
        if (Number.isFinite(total)) totals[key] = total;
      })
    );
    return totals;
  } catch {
    return undefined;
  }
}

function countEntities(entities: MigrationEntity[]): Record<MigrationEntityKind, number> {
  return {
    product: entities.filter((entity) => entity.kind === "product").length,
    productCategory: entities.filter((entity) => entity.kind === "productCategory").length,
    productTag: entities.filter((entity) => entity.kind === "productTag").length,
    post: entities.filter((entity) => entity.kind === "post").length,
    postCategory: entities.filter((entity) => entity.kind === "postCategory").length,
    postTag: entities.filter((entity) => entity.kind === "postTag").length,
    page: entities.filter((entity) => entity.kind === "page").length,
    media: entities.filter((entity) => entity.kind === "media").length,
    redirect: entities.filter((entity) => entity.kind === "redirect").length
  };
}

function dedupeEntities(entities: MigrationEntity[]): MigrationEntity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = `${entity.kind}:${entity.source.sourceType}:${entity.source.sourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeWxr(text: string): boolean {
  return text.includes("<rss") && text.includes("xmlns:wp=") && text.includes("<wp:post_type>");
}

function looksLikeWooCsv(text: string): boolean {
  const header = text.slice(0, 1000).toLowerCase();
  return (
    (header.includes("name") && (header.includes("images") || header.includes("categories")) && header.includes("published")) ||
    (header.includes("name") && header.includes("thumbnail") && header.includes("slug"))
  );
}
