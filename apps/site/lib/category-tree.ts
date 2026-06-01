export interface CategoryTreeItem<T extends { id: string; parentId?: string | undefined }> {
  category: T;
  depth: number;
  children: CategoryTreeItem<T>[];
}

export function buildCategoryTree<T extends { id: string; parentId?: string | undefined; title: string }>(
  categories: T[]
): CategoryTreeItem<T>[] {
  const nodes = new Map<string, CategoryTreeItem<T>>();
  const roots: CategoryTreeItem<T>[] = [];

  for (const category of categories) {
    nodes.set(category.id, { category, depth: 0, children: [] });
  }

  for (const node of nodes.values()) {
    const parent = node.category.parentId ? nodes.get(node.category.parentId) : undefined;
    if (parent && parent.category.id !== node.category.id) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortTree(roots);
  refreshDepths(roots, 0);
  return roots;
}

export function flattenCategoryTree<T extends { id: string; parentId?: string | undefined }>(
  tree: CategoryTreeItem<T>[]
): CategoryTreeItem<T>[] {
  return tree.flatMap((node) => [node, ...flattenCategoryTree(node.children)]);
}

function sortTree<T extends { id: string; parentId?: string | undefined; title: string }>(nodes: CategoryTreeItem<T>[]) {
  nodes.sort((a, b) => a.category.title.localeCompare(b.category.title));
  for (const node of nodes) sortTree(node.children);
}

function refreshDepths<T extends { id: string; parentId?: string | undefined }>(
  nodes: CategoryTreeItem<T>[],
  depth: number
) {
  for (const node of nodes) {
    node.depth = depth;
    refreshDepths(node.children, depth + 1);
  }
}
