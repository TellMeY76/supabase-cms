import type { ProductCategory } from "@global-trade/core";

export function categoryTitle(category: ProductCategory) {
  return category.displayTitle ?? category.title.replace(/^\s*-\s*/, "");
}

export function categoryPath(category: ProductCategory, categories: ProductCategory[]) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const parts = [category.slug];
  let current = category.parentId ? byId.get(category.parentId) : undefined;
  while (current) {
    parts.unshift(current.slug);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return `/product-category/${parts.join("/")}`;
}

export function descendantCategoryIds(categoryId: string, categories: ProductCategory[]) {
  const ids = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}
