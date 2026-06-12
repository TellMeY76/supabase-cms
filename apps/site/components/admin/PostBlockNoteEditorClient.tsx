"use client";

import {
  BlockNoteSchema,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  type Block
} from "@blocknote/core";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { zh } from "@blocknote/core/locales";
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  Bold,
  Code2,
  GalleryHorizontal,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Table2,
  Undo2
} from "lucide-react";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadFileAction } from "@/app/(admin)/admin/upload-action";
import {
  createBlockNoteDocument,
  parseBlockNoteDocument,
  serializeBlockNoteDocumentToHtml,
  type PostBlockNoteBlock
} from "@/lib/post-blocknote";
import { sanitizeAuthoredPostHtml, sanitizeRichTextHtml } from "@/lib/post-editor";
import { POST_EDITOR_FONTS, POST_EDITOR_FONT_SIZES } from "@/lib/post-fonts";
import type { PostBlockNoteEditorProps } from "./PostBlockNoteEditor";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

type GalleryItem = {
  src: string;
  alt?: string;
  caption?: string;
  link?: string;
  sourceType?: "local" | "remote";
};

const articleFont = createStringStyle("articleFont", "fontFamily");
const articleFontSize = createStringStyle("articleFontSize", "fontSize", (value) => `${value}px`);
const articleTextColor = createStringStyle("articleTextColor", "color");
const articleHighlightColor = createStringStyle("articleHighlightColor", "backgroundColor");

const articleBlockProps = {
  articleBackgroundColor: { default: "" },
  articleMarginTop: { default: "0", values: ["0", "4", "8", "12", "16", "24", "32", "48", "64"] as const },
  articleMarginBottom: { default: "0", values: ["0", "4", "8", "12", "16", "24", "32", "48", "64"] as const },
  articlePadding: { default: "0", values: ["0", "4", "8", "12", "16", "24", "32", "48", "64"] as const }
};

const paragraphBlock = createReactBlockSpec(
  {
    type: "paragraph",
    propSchema: { ...defaultBlockSpecs.paragraph.config.propSchema, ...articleBlockProps },
    content: "inline"
  },
  {
    meta: { isolating: false },
    parse: (element) => element.tagName === "P" && element.textContent?.trim() ? {} : undefined,
    render: ({ contentRef }) => <p ref={contentRef} />,
    toExternalHTML: ({ contentRef }) => <p ref={contentRef} />
  }
)();

const headingBlock = createReactBlockSpec(
  {
    type: "heading",
    propSchema: {
      backgroundColor: defaultBlockSpecs.heading.config.propSchema.backgroundColor,
      textColor: defaultBlockSpecs.heading.config.propSchema.textColor,
      textAlignment: defaultBlockSpecs.heading.config.propSchema.textAlignment,
      ...articleBlockProps,
      level: { default: 2, values: [1, 2, 3, 4, 5, 6] as const }
    },
    content: "inline"
  },
  {
    meta: { isolating: false },
    parse: (element) => /^H[1-6]$/.test(element.tagName)
      ? { level: Number(element.tagName.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }
      : undefined,
    render: ({ block, contentRef }) => renderHeading(block.props.level, contentRef),
    toExternalHTML: ({ block, contentRef }) => renderHeading(block.props.level, contentRef)
  }
)();

const quoteBlock = createReactBlockSpec(
  {
    type: "quote",
    propSchema: {
      ...defaultBlockSpecs.quote.config.propSchema,
      ...articleBlockProps,
      textAlignment: { default: "left", values: ["left", "center", "right", "justify"] as const }
    },
    content: "inline"
  },
  {
    meta: { isolating: false },
    parse: (element) => element.tagName === "BLOCKQUOTE" ? {} : undefined,
    render: ({ contentRef }) => <blockquote ref={contentRef} />,
    toExternalHTML: ({ contentRef }) => <blockquote ref={contentRef} />
  }
)();

const dividerBlock = createReactBlockSpec(
  { type: "divider", propSchema: articleBlockProps, content: "none" },
  {
    parse: (element) => element.tagName === "HR" ? {} : undefined,
    render: () => <hr />,
    toExternalHTML: () => <hr />
  }
)();

const galleryBlock = createReactBlockSpec(
  {
    type: "gallery",
    propSchema: {
      ...articleBlockProps,
      textAlignment: { default: "left", values: ["left", "center", "right", "justify"] as const },
      items: { default: "[]" },
      columns: { default: 3, values: [2, 3, 4] as const }
    },
    content: "none"
  },
  {
    render: ({ block, editor }) => <GalleryBlock block={block as any} editor={editor as any} />
  }
)();

const customHtmlBlock = createReactBlockSpec(
  {
    type: "customHtml",
    propSchema: {
      ...articleBlockProps,
      source: { default: "" },
      sourceDirty: { default: false }
    },
    content: "none"
  },
  {
    render: ({ block, editor }) => <CustomHtmlBlock block={block as any} editor={editor as any} />
  }
)();

const postSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: paragraphBlock,
    heading: headingBlock,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    quote: quoteBlock,
    divider: dividerBlock,
    image: defaultBlockSpecs.image,
    table: defaultBlockSpecs.table,
    codeBlock: defaultBlockSpecs.codeBlock,
    gallery: galleryBlock,
    customHtml: customHtmlBlock
  } as any,
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: {
    ...defaultStyleSpecs,
    articleFont,
    articleFontSize,
    articleTextColor,
    articleHighlightColor
  }
});

export function PostBlockNoteEditorClient({
  ...props
}: PostBlockNoteEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="post-editor-loading">Loading article editor...</div>;
  return <MountedPostBlockNoteEditor {...props} />;
}

function MountedPostBlockNoteEditor({
  initialContent,
  initialHtml = "",
  mode = "form",
  name,
  onDirtyChange,
  previewExcerpt = "",
  previewFeaturedImage = "",
  previewTitle = "",
  trustedEmbedHosts = []
}: PostBlockNoteEditorProps) {
  const existingDocument = useMemo(() => {
    const document = parseBlockNoteDocument(initialContent);
    return document ? { ...document, blocks: normalizeEditorBlocks(document.blocks) } : null;
  }, [initialContent]);
  const [contentJson, setContentJson] = useState(() => JSON.stringify(existingDocument ?? createBlockNoteDocument([])));
  const [contentHtml, setContentHtml] = useState(initialHtml);
  const [uploadError, setUploadError] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const initializedRef = useRef(false);
  const baselineRef = useRef("");
  const editorRootRef = useRef<HTMLDivElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
    const data = new FormData();
    data.append("file", file);
    const result = await uploadFileAction(data);
    if ("error" in result) throw new Error(result.error);
    return result.url;
  }, []);

  const editorOptions: Record<string, unknown> = {
      schema: postSchema,
      initialContent: existingDocument?.blocks?.length
        ? (existingDocument.blocks as any)
        : [{ type: "paragraph", content: "" }],
      uploadFile,
      pasteHandler: ({ event, editor: pasteEditor, defaultPasteHandler }: any) => handleArticlePaste({
        defaultPasteHandler,
        editor: pasteEditor,
        event,
        onError: setUploadError,
        trustedEmbedHosts,
        uploadFile
      }),
      tables: { splitCells: false, cellBackgroundColor: false, cellTextColor: false, headers: true },
      trailingBlock: true
  };
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) editorOptions.dictionary = zh;
  const editor = useCreateBlockNote(editorOptions as any, []) as any;
  editor.__trustedEmbedHosts = trustedEmbedHosts;

  const syncDocument = useCallback(() => {
    const document = createBlockNoteDocument(editor.document as unknown as PostBlockNoteBlock[]);
    const json = JSON.stringify(document);
    setContentJson(json);
    try {
      setContentHtml(serializeBlockNoteDocumentToHtml(document, trustedEmbedHosts));
    } catch {
      setContentHtml("");
    }
    if (initializedRef.current) onDirtyChange?.(json !== baselineRef.current);
    if (selectedBlock?.id) setSelectedBlock(editor.getBlock(selectedBlock.id) ?? null);
    window.requestAnimationFrame(() => applyArticleBlockStyles(editorRootRef.current, editor.document));
    return json;
  }, [editor, onDirtyChange, selectedBlock?.id, trustedEmbedHosts]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!existingDocument && initialHtml.trim()) {
      const blocks = shouldPreserveHtmlAsCustomBlock(initialHtml)
        ? [{ type: "customHtml", props: { source: initialHtml, sourceDirty: false } }]
        : normalizeImportedBlocks(editor.tryParseHTMLToBlocks(initialHtml));
      editor.replaceBlocks(editor.document, blocks.length ? (blocks as any) : [{ type: "paragraph", content: "" }]);
    }
    baselineRef.current = syncDocument();
    initializedRef.current = true;
    onDirtyChange?.(false);
  }, [editor, existingDocument, initialHtml, onDirtyChange, syncDocument]);

  const insertBlock = (block: Record<string, unknown>) => {
    const current = editor.getTextCursorPosition().block;
    const [inserted] = editor.insertBlocks([block as any], current, "after");
    if (inserted) {
      if (editor.schema.blockSchema[inserted.type]?.content !== "none") editor.setTextCursorPosition(inserted);
      setSelectedBlock(inserted);
    }
  };

  const previewDocument = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${previewCss()}</style></head><body><article class="article-content"><header class="article-preview-header"><p>Article preview</p><h1>${escapePreviewText(previewTitle || "Untitled post")}</h1>${previewExcerpt ? `<div>${escapePreviewText(previewExcerpt)}</div>` : ""}${safePreviewImage(previewFeaturedImage) ? `<img alt="" src="${escapePreviewAttribute(previewFeaturedImage)}">` : ""}</header>${contentHtml}</article></body></html>`;
  const inspectorTarget = mode === "blocks" && typeof document !== "undefined"
    ? document.getElementById("post-block-inspector")
    : null;

  const articleStats = getArticleStats(editor.document as PostBlockNoteBlock[]);

  return (
    <div className={`post-blocknote post-blocknote--${mode}`} ref={editorRootRef}>
      <input name={name} type="hidden" value={contentJson} />
      <input name="contentHtml" type="hidden" value={contentHtml} />
      {uploadError && <div className="post-blocknote__error">{uploadError}</div>}

      <EditorToolbar
        editor={editor as any}
        insertBlock={insertBlock}
        onUploadError={setUploadError}
        stats={articleStats}
      />

      <div hidden={mode === "preview"}>
        <BlockNoteView
          editor={editor as any}
          emojiPicker={false}
          filePanel
          onChange={syncDocument}
          onSelectionChange={() => setSelectedBlock(editor.getTextCursorPosition().block)}
          sideMenu={mode === "blocks"}
          slashMenu={false}
          tableHandles={mode === "blocks"}
          theme="light"
        >
          {mode === "blocks" && (
            <SuggestionMenuController
              getItems={async (query) => filterSuggestionItems(getPostSlashMenuItems(editor), query)}
              triggerCharacter="/"
            />
          )}
        </BlockNoteView>
      </div>

      {mode === "preview" && (
        <iframe className="post-blocknote__preview" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={previewDocument} title="Article preview" />
      )}
      {inspectorTarget && createPortal(
        <BlockInspector block={selectedBlock} editor={editor} />,
        inspectorTarget
      )}
    </div>
  );
}

function getPostSlashMenuItems(editor: any) {
  const defaults = getDefaultReactSlashMenuItems(editor);
  const customItems = [
    {
      title: "Gallery",
      subtext: "Add a responsive image gallery",
      aliases: ["images", "photos"],
      group: "Article",
      icon: <GalleryHorizontal size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "gallery", props: { items: "[]", columns: 3 } } as any)
    },
    {
      title: "Custom HTML",
      subtext: "Add sanitized display HTML",
      aliases: ["html", "embed"],
      group: "Article",
      icon: <Code2 size={18} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "customHtml", props: { source: "<div></div>", sourceDirty: true } } as any)
    }
  ];
  return [...defaults, ...customItems];
}

function handleArticlePaste({ defaultPasteHandler, editor, event, onError, trustedEmbedHosts, uploadFile }: any) {
  const clipboard = event.clipboardData;
  const files = Array.from(clipboard?.files ?? []).filter((file: any) => /^image\//i.test(file.type));
  if (files.length > 0) {
    void (async () => {
      try {
        const blocks = [];
        for (const file of files as File[]) {
          const url = await uploadFile(file);
          blocks.push({
            type: "image",
            props: {
              name: file.name.replace(/\.[^.]+$/, ""),
              textAlignment: "center",
              url
            }
          });
        }
        const current = editor.getTextCursorPosition().block;
        editor.insertBlocks(blocks, current, "after");
      } catch (error) {
        onError(error instanceof Error ? error.message : "Pasted image upload failed.");
      }
    })();
    return true;
  }

  const html = clipboard?.getData("text/html") ?? "";
  if (!html) return defaultPasteHandler({ prioritizeMarkdownOverHTML: false });
  void (async () => {
    try {
      const sanitized = await sanitizePastedArticleHtml(html, uploadFile, trustedEmbedHosts);
      if (/<iframe\b/i.test(sanitized)) {
        const current = editor.getTextCursorPosition().block;
        editor.insertBlocks([{ type: "customHtml", props: { source: sanitized, sourceDirty: true } }], current, "after");
      } else {
        editor.pasteHTML(sanitized);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Pasted content could not be imported.");
    }
  })();
  return true;
}

async function sanitizePastedArticleHtml(
  html: string,
  uploadFile: (file: File) => Promise<string>,
  trustedEmbedHosts: string[]
) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,meta,link,object,embed,noscript").forEach((element) => element.remove());
  parsed.querySelectorAll("font,o\\:p,xml").forEach((element) => element.replaceWith(...Array.from(element.childNodes)));
  parsed.querySelectorAll("h1").forEach((element) => replaceElementTag(element, "h2"));
  parsed.querySelectorAll("h5,h6").forEach((element) => replaceElementTag(element, "h4"));

  for (const image of Array.from(parsed.querySelectorAll("img"))) {
    const src = image.getAttribute("src")?.trim() ?? "";
    if (/^(?:data:|blob:)/i.test(src)) {
      const response = await fetch(src);
      if (!response.ok) throw new Error("A pasted image could not be read.");
      const blob = await response.blob();
      const extension = blob.type.split("/")[1] || "png";
      image.setAttribute("src", await uploadFile(new File([blob], `pasted-image.${extension}`, { type: blob.type })));
    } else if (!/^https:\/\//i.test(src) && !src.startsWith("/")) {
      image.remove();
    }
  }

  parsed.body.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const keep = ["href", "src", "alt", "title"].includes(attribute.name.toLowerCase());
      if (!keep || /^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    const href = element.getAttribute("href");
    if (href && !isSafePastedUrl(href, "link")) element.removeAttribute("href");
    const src = element.getAttribute("src");
    if (element.tagName === "IFRAME") {
      if (!src || !isTrustedIframeUrl(src, trustedEmbedHosts)) element.remove();
    } else if (src && !isSafePastedUrl(src, "media")) {
      element.removeAttribute("src");
    }
  });
  return parsed.body.innerHTML;
}

function isSafePastedUrl(value: string, kind: "link" | "media" | "iframe") {
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized.startsWith("/") || normalized.startsWith("#")) return kind !== "iframe";
  if (kind === "link" && /^(?:https?:|mailto:|tel:)/i.test(normalized)) return true;
  return /^https:\/\//i.test(normalized);
}

function replaceElementTag(element: Element, tagName: string) {
  const replacement = document.createElement(tagName);
  replacement.append(...Array.from(element.childNodes));
  element.replaceWith(replacement);
}

function BlockInspector({ block, editor }: any) {
  if (!block) {
    return <p className="payload-help-text">Select a block to edit its content settings.</p>;
  }
  const props = block.props ?? {};
  const updateProps = (next: Record<string, unknown>) => editor.updateBlock(block, { props: next });
  const spacingOptions = ["0", "4", "8", "12", "16", "24", "32", "48", "64"];
  return (
    <div className="post-blocknote-inspector">
      <div className="post-blocknote-inspector__heading">
        <span>Selected block</span>
        <strong>{formatBlockType(block.type)}</strong>
      </div>
      {block.type === "heading" && (
        <label>Heading level
          <select onChange={(event) => updateProps({ level: Number(event.target.value) })} value={String(props.level ?? 2)}>
            <option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
            <option value="4">Heading 4</option><option value="5">Heading 5</option><option value="6">Heading 6</option>
          </select>
        </label>
      )}
      {Object.prototype.hasOwnProperty.call(props, "textAlignment") && (
        <label>Alignment
          <select onChange={(event) => updateProps({ textAlignment: event.target.value })} value={String(props.textAlignment ?? "left")}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option>
          </select>
        </label>
      )}
      {(
        Object.prototype.hasOwnProperty.call(props, "articleBackgroundColor") ||
        Object.prototype.hasOwnProperty.call(props, "backgroundColor")
      ) && (
        <label>Background
          <div className="post-blocknote-inspector__color">
            <input
              onChange={(event) => updateProps({ articleBackgroundColor: event.target.value })}
              type="color"
              value={normalizeColor(props.articleBackgroundColor || props.backgroundColor)}
            />
            <button onClick={() => updateProps({ articleBackgroundColor: "" })} type="button">Clear</button>
          </div>
        </label>
      )}
      {Object.prototype.hasOwnProperty.call(props, "articleMarginTop") && (
        <>
          <label>Space above
            <select onChange={(event) => updateProps({ articleMarginTop: event.target.value })} value={String(props.articleMarginTop ?? "0")}>
              {spacingOptions.map((value) => <option key={value} value={value}>{value}px</option>)}
            </select>
          </label>
          <label>Space below
            <select onChange={(event) => updateProps({ articleMarginBottom: event.target.value })} value={String(props.articleMarginBottom ?? "0")}>
              {spacingOptions.map((value) => <option key={value} value={value}>{value}px</option>)}
            </select>
          </label>
          <label>Inner padding
            <select onChange={(event) => updateProps({ articlePadding: event.target.value })} value={String(props.articlePadding ?? "0")}>
              {spacingOptions.map((value) => <option key={value} value={value}>{value}px</option>)}
            </select>
          </label>
        </>
      )}
      {block.type === "table" && (
        <label className="post-blocknote-inspector__check">
          <input
            checked={Number(block.content?.headerRows ?? 0) > 0}
            onChange={(event) => editor.updateBlock(block, { content: { ...block.content, headerRows: event.target.checked ? 1 : 0 } })}
            type="checkbox"
          />
          Use first row as header
        </label>
      )}
      {block.type === "codeBlock" && (
        <label>Code language
          <input onChange={(event) => updateProps({ language: event.target.value })} placeholder="text" value={String(props.language ?? "")} />
        </label>
      )}
    </div>
  );
}

function formatBlockType(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}

function EditorToolbar({ editor, insertBlock, onUploadError, stats }: any) {
  const updateType = (type: string, props: Record<string, unknown> = {}) => {
    const block = editor.getTextCursorPosition().block;
    editor.updateBlock(block, { type, props });
    editor.focus();
  };
  const updateBlockType = (value: string) => {
    if (value.startsWith("heading-")) {
      updateType("heading", { level: Number(value.slice("heading-".length)) });
      return;
    }
    updateType(value);
  };
  return (
    <div className="post-blocknote-toolbar" role="toolbar" aria-label="Article formatting">
      <button onClick={() => editor.undo()} title="Undo" type="button"><Undo2 size={16} /></button>
      <button onClick={() => editor.redo()} title="Redo" type="button"><Redo2 size={16} /></button>
      <select aria-label="Block type" defaultValue="paragraph" onChange={(event) => updateBlockType(event.target.value)}>
        <option value="paragraph">Paragraph</option>
        <option value="heading-1">Heading 1</option>
        <option value="heading-2">Heading 2</option>
        <option value="heading-3">Heading 3</option>
        <option value="heading-4">Heading 4</option>
        <option value="heading-5">Heading 5</option>
        <option value="heading-6">Heading 6</option>
        <option value="quote">Quote</option>
        <option value="bulletListItem">Bulleted list</option>
        <option value="numberedListItem">Numbered list</option>
      </select>
      <button onClick={() => editor.toggleStyles({ bold: true })} title="Bold" type="button"><Bold size={16} /></button>
      <button onClick={() => editor.toggleStyles({ italic: true })} title="Italic" type="button"><Italic size={16} /></button>
      <button onClick={() => updateType("bulletListItem")} title="Bulleted list" type="button"><List size={16} /></button>
      <button onClick={() => updateType("numberedListItem")} title="Numbered list" type="button"><ListOrdered size={16} /></button>
      <button onClick={() => updateType("quote")} title="Quote" type="button"><Quote size={16} /></button>
      <button
        onClick={() => {
          const url = window.prompt("Link URL");
          if (!url) return;
          if (isSafePastedUrl(url, "link")) editor.createLink(url);
          else onUploadError("Use an HTTPS, HTTP, mailto, tel, anchor, or site-relative link.");
        }}
        title="Link"
        type="button"
      ><Link2 size={16} /></button>
      <select aria-label="Font" defaultValue="sans" onChange={(event) => editor.addStyles({ articleFont: event.target.value })}>
        {POST_EDITOR_FONTS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
      </select>
      <select aria-label="Font size" defaultValue="16" onChange={(event) => editor.addStyles({ articleFontSize: event.target.value })}>
        {POST_EDITOR_FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
      </select>
      <input aria-label="Text color" onChange={(event) => editor.addStyles({ articleTextColor: event.target.value })} title="Text color" type="color" />
      <button onClick={() => insertBlock({ type: "gallery", props: { items: "[]", columns: 3 } })} title="Gallery" type="button"><GalleryHorizontal size={16} /></button>
      <TableInsertControl insertBlock={insertBlock} />
      <button onClick={() => insertBlock({ type: "codeBlock", props: { language: "text" }, content: "" })} title="Code" type="button"><Code2 size={16} /></button>
      <button onClick={() => insertBlock({ type: "divider" })} title="Divider" type="button"><Minus size={16} /></button>
      <button className="post-blocknote-toolbar__html" onClick={() => insertBlock({ type: "customHtml", props: { source: "<div></div>", sourceDirty: true } })} type="button">HTML</button>
      <span className="post-blocknote-toolbar__stats">{stats.words} words · {stats.blocks} blocks</span>
    </div>
  );
}

function TableInsertControl({ insertBlock }: { insertBlock: (block: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [headerRow, setHeaderRow] = useState(true);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const insertTable = () => {
    const safeRows = clampTableSize(rows);
    const safeColumns = clampTableSize(columns);
    insertBlock({
      type: "table",
      content: {
        type: "tableContent",
        headerRows: headerRow ? 1 : 0,
        rows: Array.from({ length: safeRows }, () => ({ cells: Array.from({ length: safeColumns }, () => "") }))
      }
    });
    setOpen(false);
  };

  return (
    <div className="post-blocknote-table-control">
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)} title="Table" type="button"><Table2 size={16} /></button>
      {open && (
        <div className="post-blocknote-table-control__panel">
          <strong>Insert table</strong>
          <label>Rows<input max="20" min="1" onChange={(event) => setRows(Number(event.target.value))} type="number" value={rows} /></label>
          <label>Columns<input max="20" min="1" onChange={(event) => setColumns(Number(event.target.value))} type="number" value={columns} /></label>
          <label className="post-blocknote-table-control__check"><input checked={headerRow} onChange={(event) => setHeaderRow(event.target.checked)} type="checkbox" />Header row</label>
          <button className="post-blocknote-table-control__insert" onClick={insertTable} type="button">Insert</button>
        </div>
      )}
    </div>
  );
}

function GalleryBlock({ block, editor }: any) {
  const items = parseGalleryItems(block.props.items);
  const [url, setUrl] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const filesRef = useRef<HTMLInputElement>(null);
  const update = (next: GalleryItem[]) => editor.updateBlock(block, { props: { items: JSON.stringify(next) } });
  const uploadGalleryFile = async (file: File): Promise<GalleryItem> => {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type) || file.size > 10 * 1024 * 1024) {
      throw new Error("Gallery images must be JPEG, PNG, WebP, or GIF files no larger than 10 MB.");
    }
    const data = new FormData();
    data.append("file", file);
    const result = await uploadFileAction(data);
    if ("error" in result) throw new Error(result.error);
    return { src: result.url, alt: file.name.replace(/\.[^.]+$/, ""), sourceType: "local" };
  };
  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const additions: GalleryItem[] = [];
      for (const file of Array.from(files)) {
        additions.push(await uploadGalleryFile(file));
      }
      update([...items, ...additions]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="post-blocknote-gallery" contentEditable={false}>
      {error && <p className="post-blocknote-gallery__error">{error}</p>}
      <div className={`post-blocknote-gallery__grid post-blocknote-gallery__grid--${block.props.columns}`}>
        {items.map((item, index) => (
          <figure
            draggable
            key={`${item.src}-${index}`}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== index) update(moveItem(items, dragIndex, index));
              setDragIndex(null);
            }}
          >
            <img alt={item.alt ?? ""} src={item.src} />
            <input aria-label="Image alt text" onChange={(event) => update(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, alt: event.target.value } : entry))} placeholder="Alt text" value={item.alt ?? ""} />
            <input aria-label="Image caption" onChange={(event) => update(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, caption: event.target.value } : entry))} placeholder="Caption" value={item.caption ?? ""} />
            <input aria-label="Image link" onChange={(event) => update(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, link: event.target.value } : entry))} placeholder="Optional HTTPS link" type="url" value={item.link ?? ""} />
            <div>
              <button disabled={index === 0} onClick={() => update(moveItem(items, index, index - 1))} type="button">Up</button>
              <button disabled={index === items.length - 1} onClick={() => update(moveItem(items, index, index + 1))} type="button">Down</button>
              <button onClick={() => { const replacement = window.prompt("Replacement HTTPS image URL", item.src); if (replacement && /^https:\/\//i.test(replacement)) update(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, src: replacement, sourceType: "remote" } : entry)); }} type="button">Replace URL</button>
              <label className="post-blocknote-gallery__replace-file">
                Replace file
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    setError("");
                    void uploadGalleryFile(file)
                      .then((replacement) => update(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, ...replacement } : entry)))
                      .catch((uploadError) => setError(uploadError instanceof Error ? uploadError.message : "Upload failed."))
                      .finally(() => setUploading(false));
                  }}
                  type="file"
                />
              </label>
              <button onClick={() => update(items.filter((_: GalleryItem, itemIndex: number) => itemIndex !== index))} type="button">Remove</button>
            </div>
          </figure>
        ))}
      </div>
      <div className="post-blocknote-gallery__controls">
        <input onChange={(event) => setUrl(event.target.value)} placeholder="Paste HTTPS image URL" type="url" value={url} />
        <button onClick={() => { if (/^https:\/\//i.test(url)) { update([...items, { src: url, sourceType: "remote" }]); setUrl(""); } }} type="button">Add image</button>
        <button disabled={uploading} onClick={() => filesRef.current?.click()} type="button">{uploading ? "Uploading..." : "Upload images"}</button>
        <input accept="image/jpeg,image/png,image/webp,image/gif" hidden multiple onChange={(event) => void uploadFiles(event.target.files)} ref={filesRef} type="file" />
        <select aria-label="Gallery columns" onChange={(event) => editor.updateBlock(block, { props: { columns: Number(event.target.value) } })} value={block.props.columns}>
          <option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option>
        </select>
      </div>
    </div>
  );
}

function CustomHtmlBlock({ block, editor }: any) {
  const [editing, setEditing] = useState(false);
  const source = String(block.props.source ?? "");
  const trustedHosts = Array.isArray(editor.__trustedEmbedHosts) ? editor.__trustedEmbedHosts : [];
  const previewSource = block.props.sourceDirty
    ? sanitizeAuthoredPostHtml(source, trustedHosts)
    : sanitizeRichTextHtml(source, trustedHosts);
  return (
    <div className="post-blocknote-html" contentEditable={false}>
      <div className="post-blocknote-html__bar"><strong>Custom HTML</strong><button onClick={() => setEditing((value) => !value)} type="button">{editing ? "Safe preview" : "Edit HTML"}</button></div>
      {editing ? (
        <textarea onChange={(event) => editor.updateBlock(block, { props: { source: event.target.value, sourceDirty: true } })} spellCheck={false} value={source} />
      ) : (
        <iframe sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={previewSource} title="Custom HTML preview" />
      )}
    </div>
  );
}

function createStringStyle(type: string, cssProperty: string, transform: (value: string) => string = (value) => value) {
  return createStyleSpec(
    { type, propSchema: "string" },
    {
      render: (value) => {
        const span = document.createElement("span");
        span.style.setProperty(cssProperty, transform(value));
        return { dom: span, contentDOM: span };
      },
      parse: (element) => element.style.getPropertyValue(cssProperty) || undefined
    }
  );
}

function shouldPreserveHtmlAsCustomBlock(html: string) {
  return /<!--\s*wp:|\bwp-block-|\bstk-|<(?:iframe|form|style|script)\b/i.test(html);
}

function normalizeImportedBlocks(blocks: Block<any, any, any>[]) {
  return blocks.filter((block) => Object.prototype.hasOwnProperty.call(postSchema.blockSchema, block.type));
}

function renderHeading(level: unknown, contentRef: unknown) {
  const normalizedLevel = Number(level);
  const tagName = normalizedLevel >= 1 && normalizedLevel <= 6 ? `h${normalizedLevel}` : "h2";
  return createElement(tagName, { ref: contentRef });
}

function normalizeEditorBlocks(blocks: PostBlockNoteBlock[]): PostBlockNoteBlock[] {
  return blocks.map((block) => {
    const children = block.children ? normalizeEditorBlocks(block.children) : undefined;
    const normalizedChildren = children ? { children } : {};
    if (block.type !== "image") return { ...block, ...normalizedChildren };

    const props = block.props ?? {};
    const legacyWidth = String(props.articleWidth ?? "100");
    const legacyPreviewWidths: Record<string, number | undefined> = {
      "25": 180,
      "50": 360,
      "75": 540,
      "100": undefined
    };
    const previewWidth = typeof props.previewWidth === "number"
      ? props.previewWidth
      : legacyPreviewWidths[legacyWidth];
    const normalizedProps = {
      backgroundColor: typeof props.backgroundColor === "string" ? props.backgroundColor : "default",
      caption: typeof props.caption === "string" ? props.caption : "",
      name: typeof props.name === "string" ? props.name : String(props.alt ?? ""),
      showPreview: props.showPreview !== false,
      textAlignment: typeof props.textAlignment === "string" ? props.textAlignment : "center",
      url: typeof props.url === "string" ? props.url : String(props.src ?? "")
    };

    return {
      ...block,
      ...normalizedChildren,
      props: {
        ...normalizedProps,
        ...(previewWidth ? { previewWidth } : {})
      }
    };
  });
}

function parseGalleryItems(value: unknown): GalleryItem[] {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.src === "string") : [];
  } catch {
    return [];
  }
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function clampTableSize(value: number) {
  return Math.min(20, Math.max(1, Number.isFinite(value) ? Math.round(value) : 1));
}

function isTrustedIframeUrl(value: string, trustedHosts: string[]) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && trustedHosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function applyArticleBlockStyles(root: HTMLDivElement | null, blocks: PostBlockNoteBlock[]) {
  if (!root) return;
  for (const block of flattenEditorBlocks(blocks)) {
    const blockElement = root.querySelector<HTMLElement>(`[data-id="${CSS.escape(block.id)}"] .bn-block-content`);
    if (!blockElement) continue;
    const background = String(block.props?.articleBackgroundColor ?? block.props?.backgroundColor ?? "");
    blockElement.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(background) ? background : "";
  }
}

function getArticleStats(blocks: PostBlockNoteBlock[]) {
  const flattened = flattenEditorBlocks(blocks);
  const text = flattened.map((block) => extractBlockText(block)).join(" ");
  const latinWords = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  const cjkCharacters = text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  return { blocks: flattened.length, words: latinWords + cjkCharacters };
}

function flattenEditorBlocks(blocks: PostBlockNoteBlock[]): PostBlockNoteBlock[] {
  return blocks.flatMap((block) => [block, ...flattenEditorBlocks(Array.isArray(block.children) ? block.children : [])]);
}

function extractBlockText(block: PostBlockNoteBlock) {
  if (Array.isArray(block.content)) {
    return block.content.map((node) => extractInlineText(node)).join(" ");
  }
  if (block.type === "customHtml") return String(block.props?.source ?? "").replace(/<[^>]+>/g, " ");
  if (block.type === "image") return `${String(block.props?.alt ?? "")} ${String(block.props?.caption ?? "")}`;
  if (block.type === "gallery") {
    return parseGalleryItems(block.props?.items).map((item) => `${item.alt ?? ""} ${item.caption ?? ""}`).join(" ");
  }
  return "";
}

function extractInlineText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as Record<string, unknown>;
  if (typeof node.text === "string") return node.text;
  return Array.isArray(node.content) ? node.content.map(extractInlineText).join(" ") : "";
}

function safePreviewImage(value: string) {
  return /^(?:https?:\/\/|\/)/i.test(value.trim());
}

function escapePreviewText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePreviewAttribute(value: string) {
  return escapePreviewText(value);
}

function previewCss() {
  return `body{margin:0;color:#122f46;font-family:Arial,sans-serif}.article-content{max-width:760px;margin:0 auto;padding:32px;font-size:16px;line-height:1.75}.article-preview-header{display:grid;gap:16px;margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid #e4e7ec}.article-preview-header p{margin:0;color:#ff7417;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}.article-preview-header h1{margin:0;color:#09090b;font-size:40px;line-height:1.15}.article-preview-header div{color:#52525b;font-size:18px;line-height:1.75}.article-preview-header img{width:100%;aspect-ratio:16/9;object-fit:cover}.article-content img{max-width:100%;height:auto}.article-table-scroll{max-width:100%;overflow-x:auto}.article-content table{width:100%;border-collapse:collapse}.article-content td,.article-content th{border:1px solid #d7dce1;padding:8px}.article-gallery{display:grid;gap:16px}.article-gallery--columns-2{grid-template-columns:repeat(2,1fr)}.article-gallery--columns-3{grid-template-columns:repeat(3,1fr)}.article-gallery--columns-4{grid-template-columns:repeat(4,1fr)}.article-space-top-4{margin-top:4px}.article-space-top-8{margin-top:8px}.article-space-top-12{margin-top:12px}.article-space-top-16{margin-top:16px}.article-space-top-24{margin-top:24px}.article-space-top-32{margin-top:32px}.article-space-top-48{margin-top:48px}.article-space-top-64{margin-top:64px}.article-space-bottom-4{margin-bottom:4px}.article-space-bottom-8{margin-bottom:8px}.article-space-bottom-12{margin-bottom:12px}.article-space-bottom-16{margin-bottom:16px}.article-space-bottom-24{margin-bottom:24px}.article-space-bottom-32{margin-bottom:32px}.article-space-bottom-48{margin-bottom:48px}.article-space-bottom-64{margin-bottom:64px}.article-padding-4{padding:4px}.article-padding-8{padding:8px}.article-padding-12{padding:12px}.article-padding-16{padding:16px}.article-padding-24{padding:24px}.article-padding-32{padding:32px}.article-padding-48{padding:48px}.article-padding-64{padding:64px}[style*="--article-background-color"]{background:var(--article-background-color)}[style*="--article-text-color"]{color:var(--article-text-color)}[style*="--article-highlight-color"]{background:var(--article-highlight-color)}@media(max-width:640px){.article-content{padding:20px}.article-preview-header h1{font-size:32px}.article-gallery{grid-template-columns:1fr 1fr}}`;
}
