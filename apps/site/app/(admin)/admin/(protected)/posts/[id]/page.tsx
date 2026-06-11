import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { getAdminPost, listAdminPostCategories, listAdminPostTags } from "@/lib/admin-data";
import { normalizePostsReturnTo, trustedEmbedHosts } from "@/lib/post-editor";

export default async function EditPostPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const [{ returnTo }, post, categories, tags] = await Promise.all([
    searchParams,
    getAdminPost(id),
    listAdminPostCategories(),
    listAdminPostTags()
  ]);
  if (!post) notFound();

  return (
    <div className="post-editor-page">
      <PostForm
        blockEditorEnabled={process.env.NEXT_PUBLIC_POST_BLOCK_EDITOR_ENABLED === "true"}
        categories={categories}
        post={post}
        returnTo={normalizePostsReturnTo(returnTo)}
        tags={tags}
        trustedEmbedHosts={trustedEmbedHosts()}
      />
    </div>
  );
}
