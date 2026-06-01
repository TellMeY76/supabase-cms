"use client";

import { useMemo, useState } from "react";
import type { ProductCategory } from "@global-trade/core";
import { ChevronDown, ChevronRight, ImageIcon, Pencil, Plus, Rows3 } from "lucide-react";
import { buildCategoryTree, flattenCategoryTree } from "@/lib/category-tree";
import { ProductCategoryDialog } from "./ProductCategoryDialog";

export function ProductCategoryTreeTable({ categories }: { categories: ProductCategory[] }) {
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const allParentIds = useMemo(
    () => new Set(flattenCategoryTree(tree).filter((node) => node.children.length > 0).map((node) => node.category.id)),
    [tree]
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(allParentIds));
  const rows = visibleRows(tree, expandedIds);

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAll(expanded: boolean) {
    setExpandedIds(expanded ? new Set(allParentIds) : new Set());
  }

  return (
    <div className="payload-table-wrap">
      <div className="payload-table-toolbar">
        <span className="payload-table-toolbar-title">
          <Rows3 size={15} />
          {categories.length} categories
        </span>
        <div>
          <button className="payload-button payload-button--ghost payload-button--small" onClick={() => setAll(true)} type="button">
            Expand all
          </button>
          <button className="payload-button payload-button--ghost payload-button--small" onClick={() => setAll(false)} type="button">
            Collapse all
          </button>
        </div>
      </div>
      <table className="payload-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Image</th>
            <th>Slug</th>
            <th>Level</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ category, depth, hasChildren }) => {
            const title = category.displayTitle ?? category.title;
            const expanded = expandedIds.has(category.id);
            return (
              <tr key={category.id}>
                <td>
                  <div className="payload-title-cell payload-tree-title" style={{ paddingLeft: `${depth * 22}px` }}>
                    <span className="payload-tree-title-row">
                      {hasChildren ? (
                        <button
                          aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
                          className="payload-tree-toggle"
                          onClick={() => toggle(category.id)}
                          type="button"
                        >
                          {expanded ? <ChevronDown size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
                        </button>
                      ) : (
                        <span className="payload-tree-toggle-placeholder" />
                      )}
                      <strong>{title}</strong>
                      {hasChildren && <span className="payload-tree-count">{categoryChildCount(category.id, categories)}</span>}
                    </span>
                    {category.displayTitle && <span>{category.title}</span>}
                  </div>
                </td>
                <td>
                  {category.image?.publicUrl ? (
                    <img className="payload-category-thumb" src={category.image.publicUrl} alt="" />
                  ) : (
                    <span className="payload-category-thumb payload-category-thumb--empty">
                      <ImageIcon size={16} />
                    </span>
                  )}
                </td>
                <td>
                  <code className="payload-slug-code">{category.slug}</code>
                </td>
                <td>
                  <span className="payload-level-badge">{depth === 0 ? "Top" : `L${depth + 1}`}</span>
                </td>
                <td>
                  <span className="payload-description-cell">{category.description || "-"}</span>
                </td>
                <td>
                  <div className="payload-table-actions">
                    <ProductCategoryDialog
                      buttonClassName="payload-action-button"
                      buttonIcon={<Pencil size={14} />}
                      buttonLabel="Edit"
                      category={category}
                      categories={categories}
                      title={`Edit ${title}`}
                    />
                    <ProductCategoryDialog
                      buttonClassName="payload-action-button payload-action-button--primary"
                      buttonIcon={<Plus size={14} />}
                      buttonLabel="Add child"
                      categories={categories}
                      defaultParentId={category.id}
                      title={`Add child under ${title}`}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
          {categories.length === 0 && (
            <tr>
              <td className="payload-empty-cell" colSpan={6}>
                No categories found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function categoryChildCount(id: string, categories: ProductCategory[]) {
  return categories.filter((category) => category.parentId === id).length;
}

function visibleRows(
  nodes: ReturnType<typeof buildCategoryTree<ProductCategory>>,
  expandedIds: Set<string>
): Array<{ category: ProductCategory; depth: number; hasChildren: boolean }> {
  return nodes.flatMap((node) => {
    const row = {
      category: node.category,
      depth: node.depth,
      hasChildren: node.children.length > 0,
    };
    if (!expandedIds.has(node.category.id)) return [row];
    return [row, ...visibleRows(node.children, expandedIds)];
  });
}
