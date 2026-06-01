import type { PostCategory, ProductCategory } from "@global-trade/core";
import { buildCategoryTree, type CategoryTreeItem } from "@/lib/category-tree";

type Category = ProductCategory | PostCategory;

export function CategoryTreeSelect({
  categories,
  selectedIds,
  name = "categoryIds",
}: {
  categories: Category[];
  selectedIds: string[];
  name?: string;
}) {
  const selected = new Set(selectedIds);
  const tree = buildCategoryTree(categories);

  if (categories.length === 0) {
    return <p className="payload-help-text">Create categories first, then return to assign them.</p>;
  }

  return (
    <div className="payload-tree-select">
      {tree.map((node) => (
        <TreeNode key={node.category.id} name={name} node={node} selected={selected} />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  selected,
  name,
}: {
  node: CategoryTreeItem<Category>;
  selected: Set<string>;
  name: string;
}) {
  const category = node.category;
  const label = "displayTitle" in category && category.displayTitle ? category.displayTitle : category.title;

  return (
    <div>
      <label className="payload-tree-option" style={{ paddingLeft: `${node.depth * 22 + 10}px` }}>
        <input name={name} type="checkbox" value={category.id} defaultChecked={selected.has(category.id)} />
        <span>{label}</span>
        <small>{category.slug}</small>
      </label>
      {node.children.map((child) => (
        <TreeNode key={child.category.id} name={name} node={child} selected={selected} />
      ))}
    </div>
  );
}

