import Link from "next/link";
import { deletePostCategoryAction } from "@/app/(admin)/admin/actions";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { listAdminPostCategories } from "@/lib/admin-data";

export default async function AdminPostCategoriesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ error, success }, categories] = await Promise.all([searchParams, listAdminPostCategories()]);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Post Categories</h1>
          <p>Create and edit post category structure.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
          <Link className="payload-button" href="/admin/post-categories/new">
            New Category
          </Link>
        </div>
      </div>

      {error && <div className="payload-alert payload-alert--danger">{error}</div>}
      {success && <div className="payload-alert payload-alert--success">{success}</div>}

      <div className="payload-table-wrap">
        <table className="payload-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Parent</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  <Link href={`/admin/post-categories/${category.id}`}>{category.title}</Link>
                </td>
                <td>{category.slug}</td>
                <td>{category.parentId ? categoriesById.get(category.parentId)?.title ?? "Unknown" : "None"}</td>
                <td>
                  <div className="payload-table-actions">
                    <Link className="payload-button payload-button--small" href={`/admin/post-categories/${category.id}`}>
                      Edit
                    </Link>
                    <form action={deletePostCategoryAction}>
                      <input name="id" type="hidden" value={category.id} />
                      <button className="payload-button payload-button--danger payload-button--small" type="submit">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td className="payload-empty-cell" colSpan={4}>
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
