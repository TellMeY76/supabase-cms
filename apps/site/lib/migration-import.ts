import type { MigrationEntity } from "@global-trade/migrator";

type SupabaseServerClient = {
  from: (table: string) => any;
};

export interface MigrationImportResult {
  imported: number;
  updated: number;
  skipped: number;
  counts: Record<string, number>;
}

export async function importMigrationEntities(
  supabase: SupabaseServerClient,
  entities: MigrationEntity[]
): Promise<MigrationImportResult> {
  const result: MigrationImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    counts: entities.reduce<Record<string, number>>((counts, entity) => {
      counts[entity.kind] = (counts[entity.kind] ?? 0) + 1;
      return counts;
    }, {})
  };

  const mediaByUrl = await importMediaAssets(supabase, entities, result);
  const productCategoryIds = await importProductCategories(supabase, entities, result, mediaByUrl);
  const productTagIds = await importProductTags(supabase, entities, result);
  const postCategoryIds = await importPostCategories(supabase, entities, result);
  const postTagIds = await importPostTags(supabase, entities, result);

  for (const entity of entities) {
    if (["media", "productCategory", "productTag", "postCategory", "postTag"].includes(entity.kind)) continue;

    if (entity.kind === "product") {
      const gallery = (entity.data.gallery ?? []).map((asset) => mediaByUrl.get(asset.publicUrl) ?? asset);
      await upsertBySourceOrSlug(
        supabase,
        "products",
        entity.source,
        entity.data.slug,
        {
          slug: entity.data.slug,
          title: entity.data.title,
          status: entity.data.status,
          sku: entity.data.sku ?? null,
          product_type: entity.data.productType ?? null,
          summary: entity.data.summary ?? null,
          content_json: htmlToEditorSeed(entity.data.richText),
          rich_text: entity.data.richText,
          legacy_html: entity.data.legacyHtml ?? entity.data.richText,
          category_ids: entity.data.categoryIds.map((id) => productCategoryIds.get(id)).filter(Boolean),
          tag_ids: (entity.data.tagIds ?? []).map((id) => productTagIds.get(id)).filter(Boolean),
          primary_image: entity.data.primaryImage
            ? mediaByUrl.get(entity.data.primaryImage.publicUrl) ?? entity.data.primaryImage
            : gallery[0] ?? null,
          gallery,
          specifications: entity.data.specifications ?? [],
          regular_price: entity.data.regularPrice ?? null,
          sale_price: entity.data.salePrice ?? null,
          currency: entity.data.currency ?? null,
          price_text: entity.data.priceText ?? null,
          stock_status: entity.data.stockStatus ?? null,
          stock_quantity: entity.data.stockQuantity ?? null,
          seo: entity.data.seo ?? {},
          legacy_meta: entity.data.legacyMeta ?? {},
          source: entity.source
        },
        result
      );
      continue;
    }

    if (entity.kind === "post") {
      await upsertBySourceOrSlug(
        supabase,
        "posts",
        entity.source,
        entity.data.slug,
        {
          slug: entity.data.slug,
          title: entity.data.title,
          status: entity.data.status,
          author: entity.data.author ?? null,
          excerpt: entity.data.excerpt ?? null,
          content_json: htmlToEditorSeed(entity.data.richText),
          rich_text: entity.data.richText,
          published_at: entity.data.publishedAt ?? null,
          modified_at: entity.data.modifiedAt ?? null,
          category_ids: (entity.data.categoryIds ?? []).map((id) => postCategoryIds.get(id)).filter(Boolean),
          tag_ids: (entity.data.tagIds ?? []).map((id) => postTagIds.get(id)).filter(Boolean),
          featured_image: entity.data.featuredImage
            ? mediaByUrl.get(entity.data.featuredImage.publicUrl) ?? entity.data.featuredImage
            : null,
          seo: entity.data.seo ?? {},
          source: entity.source
        },
        result
      );
      continue;
    }

    if (entity.kind === "page") {
      await upsertBySourceOrSlug(
        supabase,
        "pages",
        entity.source,
        entity.data.slug,
        {
          slug: entity.data.slug,
          title: entity.data.title,
          status: entity.data.status,
          content_json: htmlToEditorSeed(entity.data.richText),
          rich_text: entity.data.richText,
          seo: entity.data.seo ?? {},
          source: entity.source
        },
        result
      );
      continue;
    }

    result.skipped += 1;
  }

  return result;
}

async function importMediaAssets(
  supabase: SupabaseServerClient,
  entities: MigrationEntity[],
  result: MigrationImportResult
) {
  const mediaByUrl = new Map<string, any>();
  for (const entity of entities.filter((item) => item.kind === "media")) {
    const sourceUrl = entity.data.sourceUrl;
    const cached = mediaByUrl.get(sourceUrl);
    if (cached) {
      result.skipped += 1;
      continue;
    }

    const row = await upsertMediaByUrl(
      supabase,
      {
        kind: "remote",
        storage_path: sourceUrl,
        public_url: sourceUrl,
        alt: entity.data.alt ?? null,
        title: entity.data.title ?? null,
        caption: entity.data.caption ?? null,
        mime_type: entity.data.mimeType ?? null,
        width: entity.data.width ?? null,
        height: entity.data.height ?? null,
        source: entity.source
      },
      result
    );
    if (row?.id) mediaByUrl.set(sourceUrl, mapMediaAsset(row, sourceUrl));
  }
  return mediaByUrl;
}

async function importProductCategories(
  supabase: SupabaseServerClient,
  entities: MigrationEntity[],
  result: MigrationImportResult,
  mediaByUrl: Map<string, any>
) {
  const categoryIds = new Map<string, string>();
  for (const entity of entities.filter((item) => item.kind === "productCategory")) {
    const parentId = entity.data.parentId ? categoryIds.get(entity.data.parentId) ?? null : null;
    const row = await upsertBySlug(
      supabase,
      "product_categories",
      entity.data.slug,
      compactPayload({
        slug: entity.data.slug,
        title: entity.data.title,
        display_title: entity.data.displayTitle ?? entity.data.title.replace(/^-\s*/, ""),
        description: entity.data.description ?? null,
        parent_id: parentId,
        image: entity.data.image ? mediaByUrl.get(entity.data.image.publicUrl) ?? entity.data.image : undefined,
        seo: entity.data.seo ?? {},
        source: entity.source
      }),
      result
    );
    if (row?.id) {
      categoryIds.set(entity.source.sourceId, row.id);
      categoryIds.set(entity.data.slug, row.id);
    }
  }
  return categoryIds;
}

async function importProductTags(
  supabase: SupabaseServerClient,
  entities: MigrationEntity[],
  result: MigrationImportResult
) {
  const tagIds = new Map<string, string>();
  for (const entity of entities.filter((item) => item.kind === "productTag")) {
    const row = await upsertBySlug(
      supabase,
      "product_tags",
      entity.data.slug,
      { slug: entity.data.slug, title: entity.data.title, source: entity.source },
      result
    );
    if (row?.id) {
      tagIds.set(entity.source.sourceId, row.id);
      tagIds.set(entity.data.slug, row.id);
    }
  }
  return tagIds;
}

async function importPostCategories(
  supabase: SupabaseServerClient,
  entities: MigrationEntity[],
  result: MigrationImportResult
) {
  const categoryIds = new Map<string, string>();
  for (const entity of entities.filter((item) => item.kind === "postCategory")) {
    const parentId = entity.data.parentId ? categoryIds.get(entity.data.parentId) ?? null : null;
    const row = await upsertBySlug(
      supabase,
      "post_categories",
      entity.data.slug,
      { slug: entity.data.slug, title: entity.data.title, parent_id: parentId, source: entity.source },
      result
    );
    if (row?.id) {
      categoryIds.set(entity.source.sourceId, row.id);
      categoryIds.set(entity.data.slug, row.id);
    }
  }
  return categoryIds;
}

async function importPostTags(
  supabase: SupabaseServerClient,
  entities: MigrationEntity[],
  result: MigrationImportResult
) {
  const tagIds = new Map<string, string>();
  for (const entity of entities.filter((item) => item.kind === "postTag")) {
    const row = await upsertBySlug(
      supabase,
      "post_tags",
      entity.data.slug,
      { slug: entity.data.slug, title: entity.data.title, source: entity.source },
      result
    );
    if (row?.id) {
      tagIds.set(entity.source.sourceId, row.id);
      tagIds.set(entity.data.slug, row.id);
    }
  }
  return tagIds;
}

async function upsertBySource(
  supabase: SupabaseServerClient,
  table: string,
  source: MigrationEntity["source"],
  payload: Record<string, unknown>,
  result: MigrationImportResult
): Promise<Record<string, any> | null> {
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("id")
    .eq("source->>siteUrl", source.siteUrl)
    .eq("source->>sourceType", source.sourceType)
    .eq("source->>sourceId", source.sourceId)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (existing?.id) {
    const { data, error } = await supabase.from(table).update(payload).eq("id", existing.id).select("*").single();
    if (error) throw new Error(error.message);
    result.updated += 1;
    return data;
  }

  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  result.imported += 1;
  return data;
}

async function upsertBySourceOrSlug(
  supabase: SupabaseServerClient,
  table: string,
  source: MigrationEntity["source"],
  slug: string,
  payload: Record<string, unknown>,
  result: MigrationImportResult
): Promise<Record<string, any> | null> {
  const { data: existingBySource, error: sourceError } = await supabase
    .from(table)
    .select("*")
    .eq("source->>siteUrl", source.siteUrl)
    .eq("source->>sourceType", source.sourceType)
    .eq("source->>sourceId", source.sourceId)
    .maybeSingle();

  if (sourceError) throw new Error(sourceError.message);

  const existing = existingBySource ?? (await selectBySlug(supabase, table, slug));
  if (existing?.id) {
    const { data, error } = await supabase
      .from(table)
      .update({ ...payload, source: mergeMediaSource(existing.source, payload.source) })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    result.updated += 1;
    return data;
  }

  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  result.imported += 1;
  return data;
}

async function selectBySlug(supabase: SupabaseServerClient, table: string, slug: string) {
  const { data, error } = await supabase.from(table).select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function upsertBySlug(
  supabase: SupabaseServerClient,
  table: string,
  slug: string,
  payload: Record<string, unknown>,
  result: MigrationImportResult
): Promise<Record<string, any> | null> {
  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (existing?.id) {
    const { data, error } = await supabase
      .from(table)
      .update({ ...payload, source: mergeMediaSource(existing.source, payload.source) })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    result.updated += 1;
    return data;
  }

  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  result.imported += 1;
  return data;
}

async function upsertMediaByUrl(
  supabase: SupabaseServerClient,
  payload: Record<string, unknown>,
  result: MigrationImportResult
): Promise<Record<string, any> | null> {
  const storagePath = String(payload.storage_path ?? "");
  const { data: existing, error: selectError } = await supabase
    .from("media_assets")
    .select("*")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (existing?.id) {
    const mergedSource = mergeMediaSource(existing.source, payload.source);
    const { data, error } = await supabase
      .from("media_assets")
      .update({ ...payload, source: mergedSource })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    result.updated += 1;
    return data;
  }

  const { data, error } = await supabase.from("media_assets").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  result.imported += 1;
  return data;
}

function mergeMediaSource(existing: unknown, next: unknown) {
  if (!existing) return next;
  const sources = Array.isArray((existing as { sources?: unknown[] }).sources)
    ? [...((existing as { sources: unknown[] }).sources)]
    : [existing];
  const key = JSON.stringify(next);
  if (!sources.some((source) => JSON.stringify(source) === key)) sources.push(next);
  return { primary: sources[0], sources };
}

function htmlToEditorSeed(html: string) {
  return { format: "html", html };
}

function mapMediaAsset(row: Record<string, any>, fallbackUrl: string) {
  return {
    id: row.id,
    kind: row.kind ?? "remote",
    sourceUrl: row.source?.sourceUrl ?? row.public_url ?? fallbackUrl,
    storagePath: row.storage_path ?? fallbackUrl,
    publicUrl: row.public_url ?? fallbackUrl,
    alt: row.alt ?? undefined,
    title: row.title ?? undefined,
    caption: row.caption ?? undefined,
    mimeType: row.mime_type ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    source: row.source ?? undefined
  };
}

function compactPayload(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
