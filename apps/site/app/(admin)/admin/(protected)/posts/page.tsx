import Link from "next/link";
import {
  deletePostAction,
  updatePostStatusAction,
} from "@/app/(admin)/admin/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { listAdminPostCategories, listAdminPosts } from "@/lib/admin-data";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string; success?: string }>;
}) {
  const [{ error, page: pageParam, success }, posts, categories] = await Promise.all([
    searchParams,
    listAdminPosts(),
    listAdminPostCategories(),
  ]);
  const perPage = 20;
  const page = clampPage(pageParam, posts.length, perPage);
  const pagedPosts = posts.slice((page - 1) * perPage, page * perPage);
  const categoriesById = new Map(categories.map(c => [c.id, c]));

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Posts</h1>
          <p>Create and edit news or article content.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
          <Link className="payload-button" href="/admin/posts/new">
            New Post
          </Link>
        </div>
      </div>

      {error && (
        <div className="payload-alert payload-alert--danger">{error}</div>
      )}
      {success && (
        <div className="payload-alert payload-alert--success">{success}</div>
      )}

      <div className="payload-table-wrap payload-table-wrap--sticky-actions">
        <table className="payload-table payload-table--posts">
          <thead>
            <tr>
              <th>Title</th>
              <th>Categories</th>
              <th>Status</th>
              <th>Date</th>
              <th className="payload-actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedPosts.map(post => {
              const postCategories = (post.categoryIds ?? [])
                .map(id => categoriesById.get(id)?.title)
                .filter(Boolean);

              return (
                <tr key={post.id}>
                  <td className="payload-title-column">
                    <div className="payload-title-cell">
                      <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
                      <span>{post.slug}</span>
                    </div>
                  </td>
                  <td className="payload-nowrap">
                    <span className="payload-categories-cell">
                      {postCategories.length > 0
                        ? postCategories.join(", ")
                        : "Uncategorized"}
                    </span>
                  </td>
                  <td className="payload-nowrap">
                    <span className={`payload-status payload-status--${post.status}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="payload-nowrap">
                    {new Date(
                      post.publishedAt ?? post.updatedAt
                    ).toLocaleDateString()}
                  </td>
                  <td className="payload-actions-column">
                    <div className="payload-table-actions">
                      <Link
                        className="payload-button payload-button--small"
                        href={`/admin/posts/${post.id}`}
                      >
                        Edit
                      </Link>
                      {post.status === "published" && (
                        <form action={updatePostStatusAction} className="payload-inline-form">
                          <input name="id" type="hidden" value={post.id} />
                          <input name="status" type="hidden" value="draft" />
                          <button
                            className="payload-button payload-button--ghost payload-button--small"
                            type="submit"
                          >
                            Revert to Draft
                          </button>
                        </form>
                      )}
                      <form action={deletePostAction}>
                        <input name="id" type="hidden" value={post.id} />
                        <button
                          className="payload-button payload-button--danger payload-button--small"
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td className="payload-empty-cell" colSpan={5}>
                  No posts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        basePath="/admin/posts"
        page={page}
        perPage={perPage}
        query={{ error, success }}
        total={posts.length}
      />
    </div>
  );
}

function clampPage(pageParam: string | undefined, total: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Number(pageParam ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.floor(page), 1), totalPages);
}
