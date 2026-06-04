"use client";

import type { ProductCategory } from "@global-trade/core";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { categoryTitle } from "@/lib/frontend-helpers";

export function CategoryAccordion({
  categories,
  selectedSlug
}: {
  categories: ProductCategory[];
  selectedSlug?: string | undefined;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const childMap = useMemo(() => buildChildMap(categories), [categories]);
  const topCategories = useMemo(() => childMap.get(null) ?? [], [childMap]);
  const initialOpenIds = useMemo(() => {
    const selected = selectedSlug ? categories.find((category) => category.slug === selectedSlug) : undefined;
    const ancestorIds = selected ? categoryAncestorIds(selected, categories) : [];
    const firstParent = topCategories.find((category) => (childMap.get(category.id) ?? []).length > 0);
    return new Set([...ancestorIds, ...(selected && (childMap.get(selected.id) ?? []).length > 0 ? [selected.id] : []), ...(ancestorIds.length === 0 && firstParent ? [firstParent.id] : [])]);
  }, [categories, childMap, selectedSlug, topCategories]);
  const [openIds, setOpenIds] = useState<Set<string>>(() => initialOpenIds);

  useEffect(() => {
    setOpenIds((current) => new Set([...current, ...initialOpenIds]));
  }, [initialOpenIds]);

  function toggle(categoryId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  function selectCategory(category: ProductCategory) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category.slug);
    params.delete("page");
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/products?${query}` : "/products");
    });
  }

  return (
    <ul id="category-accordion">
      {topCategories.map((category) => (
        <CategoryNode
          category={category}
          childMap={childMap}
          key={category.id}
          level={0}
          onSelect={selectCategory}
          onToggle={toggle}
          openIds={openIds}
          pending={isPending}
          selectedSlug={selectedSlug}
        />
      ))}
    </ul>
  );
}

function CategoryNode({
  category,
  childMap,
  level,
  onSelect,
  onToggle,
  openIds,
  pending,
  selectedSlug
}: {
  category: ProductCategory;
  childMap: Map<string | null, ProductCategory[]>;
  level: number;
  onSelect: (category: ProductCategory) => void;
  onToggle: (categoryId: string) => void;
  openIds: Set<string>;
  pending: boolean;
  selectedSlug?: string | undefined;
}) {
  const children = childMap.get(category.id) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = openIds.has(category.id);
  const isSelected = selectedSlug === category.slug;
  const title = categoryTitle(category);

  return (
    <li className={`category-item level-${level} ${hasChildren ? "has-children" : "is-leaf"} ${isOpen ? "is-open" : ""} ${isSelected ? "is-selected" : ""}`}>
      <button
        aria-current={isSelected ? "true" : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        className={`category-header category-action ${pending && isSelected ? "is-pending" : ""}`}
        onClick={() => (hasChildren ? onToggle(category.id) : onSelect(category))}
        type="button"
      >
        <span className="category-title-link">
          {category.image?.publicUrl && <img src={category.image.publicUrl} alt={title} />}
          <span className="category-header-text">
            <span>{title}</span>
          </span>
        </span>
        {hasChildren ? (
          <span className="category-toggle" aria-hidden="true">
            {isOpen ? <ChevronUp size={16} strokeWidth={2.6} /> : <ChevronDown size={16} strokeWidth={2.6} />}
          </span>
        ) : null}
      </button>
      {hasChildren && isOpen ? (
        <ul className="subcategory-list">
          {children.map((child) => (
            <CategoryNode
              category={child}
              childMap={childMap}
              key={child.id}
              level={level + 1}
              onSelect={onSelect}
              onToggle={onToggle}
              openIds={openIds}
              pending={pending}
              selectedSlug={selectedSlug}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function buildChildMap(categories: ProductCategory[]) {
  const map = new Map<string | null, ProductCategory[]>();
  for (const category of categories) {
    const key = category.parentId ?? null;
    const children = map.get(key) ?? [];
    children.push(category);
    map.set(key, children);
  }
  return map;
}

function categoryAncestorIds(category: ProductCategory, categories: ProductCategory[]) {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const ids: string[] = [];
  let current = category.parentId ? byId.get(category.parentId) : undefined;
  while (current) {
    ids.unshift(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return ids;
}
