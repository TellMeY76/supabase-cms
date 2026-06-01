import type { Post, PostCategory } from "@global-trade/core";
import { savePostAction } from "@/app/(admin)/admin/actions";
import { emptyRichTextDocument } from "@/lib/rich-text";
import { RichTextEditor } from "./RichTextEditor";
import { FileDropzone } from "./FileDropzone";
import { CategoryTreeSelect } from "./CategoryTreeSelect";

export function PostForm({ post, categories = [] }: { post?: Partial<Post> & { contentJson?: unknown }; categories?: PostCategory[] }) {
  return (
    <form action={savePostAction} className="payload-form">
      {post?.id && <input name="id" type="hidden" value={post.id} />}
      <section className="payload-form-section">
        <h2>Content</h2>
        <div className="payload-field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required defaultValue={post?.title ?? ""} />
        </div>
        <div className="payload-field">
          <label htmlFor="slug">Slug</label>
          <input id="slug" name="slug" defaultValue={post?.slug ?? ""} />
        </div>
        <div className="payload-field">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea id="excerpt" name="excerpt" rows={3} defaultValue={post?.excerpt ?? ""} />
        </div>
        <div className="payload-field">
          <label>Categories</label>
          <CategoryTreeSelect categories={categories} selectedIds={post?.categoryIds ?? []} />
        </div>
        <div className="payload-field">
          <label htmlFor="author">Author</label>
          <input id="author" name="author" defaultValue={post?.author ?? ""} />
        </div>
        <div className="payload-field">
          <label>Featured image</label>
          <FileDropzone name="featuredImageUrl" defaultValue={post?.featuredImage?.publicUrl ?? undefined} label="拖拽图片到此处，或点击选择" />
        </div>
        <div className="payload-field">
          <label>Rich content</label>
          <RichTextEditor name="contentJson" initialContent={post?.contentJson ?? emptyRichTextDocument} initialHtml={post?.richText ?? ""} />
        </div>
      </section>
      <section className="payload-form-section">
        <h2>SEO and publishing</h2>
        <div className="payload-field">
          <label htmlFor="seoTitle">SEO title</label>
          <input id="seoTitle" name="seoTitle" defaultValue={post?.seo?.title ?? ""} />
        </div>
        <div className="payload-field">
          <label htmlFor="seoDescription">SEO description</label>
          <textarea id="seoDescription" name="seoDescription" rows={3} defaultValue={post?.seo?.description ?? ""} />
        </div>
        <div className="payload-field">
          <label htmlFor="seoCanonicalUrl">Canonical URL</label>
          <input id="seoCanonicalUrl" name="seoCanonicalUrl" defaultValue={post?.seo?.canonicalUrl ?? ""} />
        </div>
        <div className="payload-field">
          <label htmlFor="seoOgImageUrl">OG image URL</label>
          <input id="seoOgImageUrl" name="seoOgImageUrl" defaultValue={post?.seo?.ogImageUrl ?? ""} />
        </div>
        <label className="payload-checkbox">
          <input name="seoNoindex" type="checkbox" defaultChecked={post?.seo?.noindex ?? false} />
          <span>Noindex</span>
        </label>
        <div className="payload-field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={post?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="payload-field">
          <label htmlFor="publishedAt">Published at</label>
          <input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={toDatetimeLocal(post?.publishedAt)} />
        </div>
      </section>
      <button className="payload-button" type="submit">
        Save post
      </button>
    </form>
  );
}

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}
