import { PostForm } from "@/components/admin/PostForm";
import { listAdminPostCategories, listAdminPostTags } from "@/lib/admin-data";
import { normalizePostsReturnTo, trustedEmbedHosts } from "@/lib/post-editor";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const [{ returnTo }, categories, tags] = await Promise.all([searchParams, listAdminPostCategories(), listAdminPostTags()]);

  return (
    <div className="post-editor-page">
      <PostForm
        blockEditorEnabled={process.env.NEXT_PUBLIC_POST_BLOCK_EDITOR_ENABLED === "true"}
        categories={categories}
        returnTo={normalizePostsReturnTo(returnTo)}
        tags={tags}
        trustedEmbedHosts={trustedEmbedHosts()}
      />
    </div>
  );
}
