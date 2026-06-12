"use client";

import type { Post, PostCategory, PostTag, PublishStatus } from "@global-trade/core";
import { ArrowLeft, Eye, FileText, LayoutTemplate, Save } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { savePostAction } from "@/app/(admin)/admin/actions";
import { emptyRichTextDocument } from "@/lib/rich-text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTreeSelect } from "./CategoryTreeSelect";
import { FileDropzone } from "./FileDropzone";
import { PostTagSelect } from "./PostTagSelect";
import type { RichTextEditorMode } from "./RichTextEditor";

const BlockNotePostEditor = dynamic(
  () => import("./PostBlockNoteEditor").then((module) => module.PostBlockNoteEditor),
  { ssr: false, loading: () => <EditorLoading /> }
);

const LexicalPostEditor = dynamic(
  () => import("./RichTextEditor").then((module) => module.RichTextEditor),
  { ssr: false, loading: () => <EditorLoading /> }
);

type AdminPost = Partial<Post> & { contentJson?: unknown };

interface PostFormProps {
  post?: AdminPost;
  categories?: PostCategory[];
  tags?: PostTag[];
  blockEditorEnabled?: boolean;
  editorEngine?: "blocknote" | "lexical";
  returnTo?: string;
  trustedEmbedHosts?: string[];
}

export function PostForm({
  post,
  categories = [],
  tags = [],
  blockEditorEnabled = false,
  editorEngine = "lexical",
  returnTo = "/admin/posts",
  trustedEmbedHosts = []
}: PostFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<RichTextEditorMode>("form");
  const [bodyDirty, setBodyDirty] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [legacyWarningOpen, setLegacyWarningOpen] = useState(false);
  const [legacyWarningSeen, setLegacyWarningSeen] = useState(false);
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage?.publicUrl ?? "");
  const initialFeaturedImageRef = useRef(post?.featuredImage?.publicUrl ?? "");
  const initialJson = useMemo(() => post?.contentJson ?? emptyRichTextDocument, [post?.contentJson]);
  const initialHtml = post?.richText ?? "";
  const status = post?.status ?? "draft";
  const isLegacyHtml = Boolean(post?.id) && isLegacyPostContent(initialJson, initialHtml);
  const isDirty = bodyDirty || formDirty;
  const handleFeaturedImageChange = useCallback((urls: string[]) => {
    const nextUrl = urls[0] ?? "";
    setFeaturedImage(nextUrl);
    if (nextUrl !== initialFeaturedImageRef.current) setFormDirty(true);
  }, []);

  useUnsavedPostWarning(isDirty);
  usePostEditorShortcuts({ formRef, mode, setMode, status });

  useEffect(() => {
    const textarea = titleRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [mode, title]);

  function enterBlockEditor() {
    if (isLegacyHtml && !legacyWarningSeen) {
      setLegacyWarningOpen(true);
      return;
    }
    setMode("blocks");
  }

  function confirmLegacyEditor() {
    setLegacyWarningSeen(true);
    setLegacyWarningOpen(false);
    setMode("blocks");
  }

  return (
    <>
      <form
        action={savePostAction}
        className={`post-editor-form post-editor-form--${mode}`}
        onInput={(event) => {
          if (!(event.target instanceof HTMLInputElement && event.target.type === "hidden")) setFormDirty(true);
        }}
        onSubmit={(event) => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          if (!(submitter instanceof HTMLButtonElement) || submitter.name !== "intent") {
            event.preventDefault();
            return;
          }
          setBodyDirty(false);
          setFormDirty(false);
        }}
        ref={formRef}
      >
        {post?.id && <input name="id" type="hidden" value={post.id} />}
        <input name="status" type="hidden" value={status} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <input name="contentDirty" type="hidden" value={bodyDirty ? "true" : "false"} />

        <div className="post-editor-topbar">
          <div className="post-editor-topbar__start">
            <Link className="post-editor-icon-link" href={returnTo} title="Back to Posts">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <strong>{post?.id ? "Edit post" : "New post"}</strong>
              <span>{formatStatus(status)}</span>
            </div>
          </div>
          <div className="post-editor-topbar__actions">
            {(editorEngine === "blocknote" || blockEditorEnabled) && mode === "form" && (
              <Button className="post-editor-block-trigger" onClick={enterBlockEditor} type="button" variant="outline">
                <LayoutTemplate size={16} />
                Block editor
              </Button>
            )}
            {mode !== "form" && (
              <>
                <Button onClick={() => setMode("form")} type="button" variant="outline">
                  <FileText size={16} />
                  Form editor
                </Button>
                <Button onClick={() => setMode(mode === "preview" ? "blocks" : "preview")} type="button" variant="outline">
                  {mode === "preview" ? <LayoutTemplate size={16} /> : <Eye size={16} />}
                  {mode === "preview" ? "Edit" : "Preview"}
                </Button>
              </>
            )}
            <PostSaveButtons status={status} />
          </div>
        </div>

        <div className="post-editor-layout">
          <main className="post-editor-main">
            <section className="payload-form-section post-editor-content-section">
              <div className="payload-field post-editor-title-field">
                <label htmlFor="title">Title</label>
                <textarea
                  id="title"
                  name="title"
                  onChange={(event) => setTitle(event.target.value.replace(/[\r\n]+/g, " "))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  required
                  ref={titleRef}
                  rows={1}
                  value={title}
                />
              </div>
              <div className="payload-field post-editor-excerpt-field">
                <label htmlFor="excerpt">Excerpt</label>
                <textarea id="excerpt" name="excerpt" onChange={(event) => setExcerpt(event.target.value)} rows={3} value={excerpt} />
              </div>

              {editorEngine !== "blocknote" && mode === "preview" && (
                <header className="post-editor-preview-header">
                  <p>Article preview</p>
                  <h1>{title || "Untitled post"}</h1>
                  {excerpt && <div>{excerpt}</div>}
                  {featuredImage && <img alt="" src={featuredImage} />}
                </header>
              )}

              <div className="payload-field post-editor-body-field">
                <label>Article content</label>
                {editorEngine === "blocknote" ? (
                  <BlockNotePostEditor
                    initialContent={initialJson}
                    initialHtml={initialHtml}
                    mode={mode}
                    name="contentJson"
                    onDirtyChange={setBodyDirty}
                    previewExcerpt={excerpt}
                    previewFeaturedImage={featuredImage}
                    previewTitle={title}
                    trustedEmbedHosts={trustedEmbedHosts}
                  />
                ) : (
                  <LexicalPostEditor
                    cleanPaste
                    initialContent={initialJson}
                    initialHtml={initialHtml}
                    mode={mode}
                    name="contentJson"
                    onDirtyChange={setBodyDirty}
                    trustedEmbedHosts={trustedEmbedHosts}
                  />
                )}
              </div>
            </section>
          </main>

          <aside className="post-editor-sidebar">
            <Tabs defaultValue="post">
              <TabsList className="post-editor-sidebar-tabs">
                <TabsTrigger value="post">Post</TabsTrigger>
                <TabsTrigger disabled={mode === "form" || mode === "preview"} value="block">Block</TabsTrigger>
              </TabsList>
              <TabsContent value="post">
            <section className="payload-form-section">
              <div className="post-editor-sidebar-heading">
                <div>
                  <span>Post</span>
                  <strong>Article settings</strong>
                </div>
                <span className={`payload-status payload-status--${status}`}>{formatStatus(status)}</span>
              </div>
              <div className="payload-field">
                <label htmlFor="slug">Slug</label>
                <input id="slug" name="slug" defaultValue={post?.slug ?? ""} />
              </div>
              <div className="payload-field">
                <label htmlFor="author">Author</label>
                <input id="author" name="author" defaultValue={post?.author ?? ""} />
              </div>
              <div className="payload-field">
                <label>Categories</label>
                <CategoryTreeSelect categories={categories} selectedIds={post?.categoryIds ?? []} />
              </div>
              <div className="payload-field">
                <label>Tags</label>
                <PostTagSelect selectedIds={post?.tagIds ?? []} tags={tags} />
              </div>
              <div className="payload-field">
                <label>Featured image</label>
                <FileDropzone
                  defaultValue={post?.featuredImage?.publicUrl ?? undefined}
                  label="Drop an image here, or choose a file"
                  name="featuredImageUrl"
                  onUrlsChange={handleFeaturedImageChange}
                />
              </div>
              <div className="payload-field">
                <label htmlFor="publishedAt">Published at</label>
                <input defaultValue={toDatetimeLocal(post?.publishedAt)} id="publishedAt" name="publishedAt" type="datetime-local" />
              </div>
            </section>

            <section className="payload-form-section">
              <h2>SEO</h2>
              <div className="payload-field">
                <label htmlFor="seoTitle">SEO title</label>
                <input defaultValue={post?.seo?.title ?? ""} id="seoTitle" name="seoTitle" />
              </div>
              <div className="payload-field">
                <label htmlFor="seoDescription">SEO description</label>
                <textarea defaultValue={post?.seo?.description ?? ""} id="seoDescription" name="seoDescription" rows={3} />
              </div>
              <div className="payload-field">
                <label htmlFor="seoCanonicalUrl">Canonical URL</label>
                <input defaultValue={post?.seo?.canonicalUrl ?? ""} id="seoCanonicalUrl" name="seoCanonicalUrl" />
              </div>
              <div className="payload-field">
                <label htmlFor="seoOgImageUrl">OG image URL</label>
                <input defaultValue={post?.seo?.ogImageUrl ?? ""} id="seoOgImageUrl" name="seoOgImageUrl" />
              </div>
              <label className="payload-checkbox">
                <input defaultChecked={post?.seo?.noindex ?? false} name="seoNoindex" type="checkbox" />
                <span>Prevent search indexing</span>
              </label>
            </section>
              </TabsContent>
              <TabsContent className="data-[state=inactive]:hidden" forceMount value="block">
                <section className="payload-form-section post-editor-block-inspector">
                  <div id="post-block-inspector" />
                </section>
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </form>

      <Dialog onOpenChange={setLegacyWarningOpen} open={legacyWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open imported HTML in the block editor?</DialogTitle>
            <DialogDescription>
              This article contains legacy WordPress HTML. Opening it is safe, and the original HTML remains untouched until you edit the body and save.
            </DialogDescription>
          </DialogHeader>
          <div className="post-editor-dialog-actions">
            <Button onClick={() => setLegacyWarningOpen(false)} type="button" variant="outline">Cancel</Button>
            <Button onClick={confirmLegacyEditor} type="button">Open block editor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PostSaveButtons({ status }: { status: PublishStatus }) {
  if (status === "published") {
    return (
      <>
        <Button name="intent" type="submit" value="draft" variant="outline">Move to draft</Button>
        <Button name="intent" type="submit" value="update"><Save size={16} />Update</Button>
      </>
    );
  }

  if (status === "archived") {
    return (
      <>
        <Button name="intent" type="submit" value="restore" variant="outline">Restore to draft</Button>
        <Button name="intent" type="submit" value="update"><Save size={16} />Save archived</Button>
      </>
    );
  }

  return (
    <>
      <Button name="intent" type="submit" value="draft" variant="outline">Save draft</Button>
      <Button name="intent" type="submit" value="publish">Publish</Button>
    </>
  );
}

function EditorLoading() {
  return <div className="post-editor-loading">Loading article editor...</div>;
}

function useUnsavedPostWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      if (!window.confirm("Leave this page? Unsaved post changes will be lost.")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [isDirty]);
}

function usePostEditorShortcuts({
  formRef,
  mode,
  setMode,
  status
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  mode: RichTextEditorMode;
  setMode: (mode: RichTextEditorMode) => void;
  status: PublishStatus;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const intent = status === "draft" ? "draft" : "update";
        const submitter = formRef.current?.querySelector<HTMLButtonElement>(`button[name="intent"][value="${intent}"]`);
        formRef.current?.requestSubmit(submitter);
      }
      if (event.key === "Escape" && mode === "preview") setMode("blocks");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formRef, mode, setMode, status]);
}

function isLegacyPostContent(content: unknown, html: string) {
  if (content && typeof content === "object" && "format" in content && (content as { format?: unknown }).format === "html") return true;
  return /<!--\s*wp:|\bwp-block-|\bstk-|\bhas-[\w-]+-(?:color|background-color)\b/i.test(html);
}

function formatStatus(status: PublishStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}
