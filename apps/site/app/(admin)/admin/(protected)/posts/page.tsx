import Link from "next/link";
import {
  deletePostAction,
  updatePostStatusAction,
} from "@/app/(admin)/admin/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { SplitActionsTable } from "@/components/admin/SplitActionsTable";
import { listAdminPostCategories, listAdminPostsPage } from "@/lib/admin-data";

const perPage = 20;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string; success?: string }>;
}) {
  const { error, page: pageParam, success } = await searchParams;
  const returnTo = `/admin/posts${pageParam ? `?page=${encodeURIComponent(pageParam)}` : ""}`;
  const editorQuery = `?returnTo=${encodeURIComponent(returnTo)}`;
  const [postsPage, categories] = await Promise.all([
    listAdminPostsPage({ page: pageParam, perPage }),
    listAdminPostCategories(),
  ]);
  const posts = postsPage.items;
  const categoriesById = new Map(categories.map(c => [c.id, c]));
  const postRows = posts.map((post) => {
    const postCategories = (post.categoryIds ?? [])
      .map(id => categoriesById.get(id)?.title)
      .filter((title): title is string => Boolean(title));

    return {
      post,
      postCategories
    };
  });

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Posts</h1>
          <p>Create and edit news or article content.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
          <Link className="payload-button" href={`/admin/posts/new${editorQuery}`}>
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

      <SplitActionsTable className="payload-table-split--posts">
        <div className="payload-table-split__scroll">
          <table className="payload-table payload-table--posts">
            <thead>
              <tr>
                <th>Title</th>
                <th>Categories</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {postRows.map(({ post, postCategories }) => (
                <tr key={post.id}>
                  <td className="payload-title-column">
                    <div className="payload-title-cell">
                      <Link href={`/admin/posts/${post.id}${editorQuery}`}>{post.title}</Link>
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
                </tr>
              ))}
              {postsPage.total === 0 && (
                <tr>
                  <td className="payload-empty-cell" colSpan={4}>
                    No posts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="payload-table-split__actions" aria-label="Post actions">
          <div className="payload-table-split__actions-head">Actions</div>
          {postRows.map(({ post }) => (
            <div className="payload-table-split__actions-row" key={post.id}>
              <div className="payload-table-actions">
                <Link
                  className="payload-button payload-button--small"
                  href={`/admin/posts/${post.id}${editorQuery}`}
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
            </div>
          ))}
          {postsPage.total === 0 && <div className="payload-table-split__actions-row payload-table-split__actions-row--empty">-</div>}
        </div>
      </SplitActionsTable>
      <AdminPagination
        basePath="/admin/posts"
        page={postsPage.page}
        perPage={postsPage.perPage}
        query={{ error, success }}
        total={postsPage.total}
      />
    </div>
  );
}
