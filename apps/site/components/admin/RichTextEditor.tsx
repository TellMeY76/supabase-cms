"use client";

import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  ListItemNode,
  ListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  TableCellNode,
  TableNode,
  TableRowNode,
  INSERT_TABLE_COMMAND,
} from "@lexical/table";
import {
  $createNodeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isTextNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  DecoratorNode,
  FORMAT_TEXT_COMMAND,
  PASTE_COMMAND,
  REDO_COMMAND,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  UNDO_COMMAND,
  createCommand,
} from "lexical";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Braces,
  Code2,
  GalleryHorizontal,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Plus,
  Quote as QuoteIcon,
  Redo2,
  Table,
  Undo2,
} from "lucide-react";
import { uploadFileAction } from "@/app/(admin)/admin/upload-action";
import { encodePreservedPostHtml, sanitizeAuthoredPostHtml, sanitizeRichTextHtml } from "@/lib/post-editor";
import { emptyRichTextDocument } from "@/lib/rich-text";
import dynamic from "next/dynamic";

const PostBlockModePlugins = dynamic(
  () => import("./PostBlockModePlugins").then((module) => module.PostBlockModePlugins),
  { ssr: false }
);

export function RichTextEditor({
  name,
  htmlName = "contentHtml",
  initialContent,
  initialHtml,
  mode = "form",
  cleanPaste = false,
  onDirtyChange,
  trustedEmbedHosts = [],
}: {
  name: string;
  htmlName?: string;
  initialContent?: unknown;
  initialHtml?: string;
  mode?: RichTextEditorMode;
  cleanPaste?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  trustedEmbedHosts?: string[];
}) {
  const editorState = useMemo(() => {
    return buildInitialEditorState(initialContent, initialHtml);
  }, [initialContent, initialHtml]);

  const initialConfig = {
    namespace: `admin-${name}`,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      TableNode,
      TableRowNode,
      TableCellNode,
      ImageNode,
      GalleryNode,
      CodeBlockNode,
      CustomHtmlNode,
      DividerNode,
    ],
    onError(error: Error) {
      throw error;
    },
    ...(editorState ? { editorState } : {}),
    theme: {
      paragraph: "payload-editor-paragraph",
      quote: "payload-editor-quote",
      heading: {
        h1: "payload-editor-heading payload-editor-heading--h1",
        h2: "payload-editor-heading payload-editor-heading--h2",
        h3: "payload-editor-heading payload-editor-heading--h3",
      },
      list: {
        ul: "payload-editor-list",
        ol: "payload-editor-list",
      },
      link: "payload-editor-link",
      table: "payload-editor-table",
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`payload-editor payload-editor--${mode}`} data-trusted-embed-hosts={trustedEmbedHosts.join(",")}>
        <input
          name={name}
          type="hidden"
          defaultValue={JSON.stringify(initialContent ?? emptyRichTextDocument)}
        />
        <input name={htmlName} type="hidden" defaultValue={initialHtml ?? ""} />
        {mode !== "preview" && <Toolbar showPostBlocks={mode === "blocks"} />}
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="payload-editor-content" />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <TablePlugin />
        <ImagePlugin />
        <AtomicBlockPlugin />
        {cleanPaste && <CleanPastePlugin />}
        {mode === "blocks" && <PostBlockModePlugins />}
        <EditorModePlugin mode={mode} />
        <SyncPlugin htmlName={htmlName} jsonName={name} {...(onDirtyChange ? { onDirtyChange } : {})} />
        <HtmlSeedPlugin
          html={isHtmlSeed(initialContent) ? initialContent.html : ""}
        />
      </div>
    </LexicalComposer>
  );
}

function Toolbar({ showPostBlocks }: { showPostBlocks: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [uploading, setUploading] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadFileAction(formData);
        if ("url" in result) {
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            src: result.url,
            alt: file.name,
            title: file.name,
            kind: "local",
          });
        }
      } finally {
        setUploading(false);
        if (e.target) e.target.value = "";
      }
    },
    [editor]
  );

  const handleGalleryUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      setUploading(true);
      try {
        const items: GalleryItem[] = [];
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadFileAction(formData);
          if ("error" in result) {
            window.alert(result.error);
            return;
          }
          items.push({ src: result.url, alt: file.name, caption: "", link: "", kind: "local" });
        }
        editor.dispatchCommand(INSERT_GALLERY_COMMAND, { items, columns: 3 });
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [editor]
  );

  return (
    <div className="payload-editor-toolbar">
      <button
        type="button"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Undo"
      >
        <Undo2 size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Redo"
      >
        <Redo2 size={15} />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        I
      </button>
      <button type="button" onClick={() => setHeading(editor, "h2")}>
        H2
      </button>
      <button type="button" onClick={() => setHeading(editor, "h3")}>
        H3
      </button>
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        title="Bullet list"
      >
        <List size={15} />
      </button>
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        title="Ordered list"
      >
        <ListOrdered size={15} />
      </button>
      <button
        type="button"
        onClick={() => {
          const href = window.prompt("Link URL");
          if (href) editor.dispatchCommand(TOGGLE_LINK_COMMAND, href);
        }}
        title="Link"
      >
        <LinkIcon size={15} />
      </button>
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            rows: "3",
            columns: "2",
            includeHeaders: true,
          })
        }
        title="Table"
      >
        <Table size={15} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="Insert image"
      >
        {uploading ? (
          <Loader2 size={15} className="payload-spin" />
        ) : (
          <ImageIcon size={15} />
        )}
      </button>
      {showPostBlocks && <div className="payload-editor-add-block">
        <button onClick={() => setBlockMenuOpen((open) => !open)} title="Add block" type="button">
          <Plus size={15} />
          <span>Add block</span>
        </button>
        {blockMenuOpen && (
          <div className="payload-editor-block-menu">
            <button onClick={() => insertQuote(editor, setBlockMenuOpen)} type="button"><QuoteIcon size={15} />Quote</button>
            <button
              onClick={() => {
                const url = window.prompt("Image URL");
                if (url?.trim()) editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: url.trim(), alt: "", kind: "remote" });
                setBlockMenuOpen(false);
              }}
              type="button"
            ><ImageIcon size={15} />Image URL</button>
            <button onClick={() => galleryInputRef.current?.click()} type="button"><GalleryHorizontal size={15} />Gallery upload</button>
            <button
              onClick={() => {
                const value = window.prompt("Paste image URLs, separated by commas or new lines");
                const items = (value ?? "").split(/[\n,]+/).map((src) => src.trim()).filter(Boolean).map((src) => ({ src, alt: "", caption: "", link: "", kind: "remote" as const }));
                if (items.length > 0) editor.dispatchCommand(INSERT_GALLERY_COMMAND, { items, columns: 3 });
                setBlockMenuOpen(false);
              }}
              type="button"
            ><GalleryHorizontal size={15} />Gallery URLs</button>
            <button onClick={() => insertAtomicBlock(editor, INSERT_DIVIDER_COMMAND, undefined, setBlockMenuOpen)} type="button"><Minus size={15} />Separator</button>
            <button onClick={() => insertAtomicBlock(editor, INSERT_CODE_BLOCK_COMMAND, { code: "", language: "text" }, setBlockMenuOpen)} type="button"><Code2 size={15} />Code</button>
            <button onClick={() => insertAtomicBlock(editor, INSERT_CUSTOM_HTML_COMMAND, { source: "<div></div>" }, setBlockMenuOpen)} type="button"><Braces size={15} />Custom HTML</button>
          </div>
        )}
      </div>}
      {showPostBlocks && <input ref={galleryInputRef} accept="image/*" multiple onChange={handleGalleryUpload} style={{ display: "none" }} type="file" />}
    </div>
  );
}

function insertQuote(editor: ReturnType<typeof useLexicalComposerContext>[0], close: (open: boolean) => void) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode());
  });
  close(false);
}

function insertAtomicBlock<T>(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  command: LexicalCommand<T>,
  payload: T,
  close: (open: boolean) => void
) {
  editor.dispatchCommand(command, payload);
  close(false);
}

function SyncPlugin({
  jsonName,
  htmlName,
  onDirtyChange,
}: {
  jsonName: string;
  htmlName: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState, _editor, tags) => {
        if (tags.has("html-seed")) return;
        const jsonField = document.querySelector<HTMLInputElement>(
          `input[name="${jsonName}"]`
        );
        const htmlField = document.querySelector<HTMLInputElement>(
          `input[name="${htmlName}"]`
        );
        if (jsonField) jsonField.value = JSON.stringify({ format: "lexical", schemaVersion: 2, ...editorState.toJSON() });
        if (htmlField) {
          editorState.read(() => {
            htmlField.value = $generateHtmlFromNodes(editor);
          });
        }
        onDirtyChange?.(true);
      }}
    />
  );
}

function HtmlSeedPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!html) return;
    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, "text/html");
      const root = $getRoot();
      root.clear();
      for (const child of Array.from(dom.body.childNodes)) {
        if (child instanceof HTMLElement && shouldPreserveAsCustomHtml(child)) {
          root.append($createCustomHtmlNode(child.outerHTML, false));
          continue;
        }

        const fragment = parser.parseFromString(child instanceof HTMLElement ? child.outerHTML : child.textContent ?? "", "text/html");
        appendGeneratedNodes(root, $generateNodesFromDOM(editor, fragment));
      }
      if (root.getChildrenSize() === 0) root.append($createParagraphNode());
    }, { tag: "html-seed" });
  }, [editor, html]);
  return null;
}

function appendGeneratedNodes(root: ReturnType<typeof $getRoot>, nodes: LexicalNode[]) {
  for (const node of nodes) {
    if ($isElementNode(node) || node instanceof DecoratorNode) {
      root.append(node);
      continue;
    }

    if ($isTextNode(node)) {
      const paragraph = $createParagraphNode();
      paragraph.append(node);
      root.append(paragraph);
    }
  }
}

function shouldPreserveAsCustomHtml(element: HTMLElement) {
  const className = element.className;
  if (/\bstk-|\bstackable\b/i.test(className)) return true;
  if (/\bwp-block-(?:group|columns?|cover|buttons?|media-text|embed|gallery)\b/i.test(className)) return true;
  return ["IFRAME", "VIDEO", "AUDIO", "FORM"].includes(element.tagName);
}

function EditorModePlugin({ mode }: { mode: RichTextEditorMode }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(mode !== "preview");
  }, [editor, mode]);
  return null;
}

function ImagePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      payload => {
        $insertNodes([$createImageNode(payload)]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);
  return null;
}

function AtomicBlockPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const unregister = [
      editor.registerCommand(
        INSERT_GALLERY_COMMAND,
        (payload) => {
          $insertNodes([$createGalleryNode(payload)]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        INSERT_CODE_BLOCK_COMMAND,
        (payload) => {
          $insertNodes([$createCodeBlockNode(payload)]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        INSERT_CUSTOM_HTML_COMMAND,
        (payload) => {
          $insertNodes([$createCustomHtmlNode(payload.source, true)]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand(
        INSERT_DIVIDER_COMMAND,
        () => {
          $insertNodes([$createDividerNode()]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      )
    ];
    return () => unregister.forEach((callback) => callback());
  }, [editor]);
  return null;
}

function CleanPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!(event instanceof ClipboardEvent) || !event.clipboardData) return false;
        const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length > 0) {
          event.preventDefault();
          void uploadPastedImages(editor, imageFiles);
          return true;
        }

        const html = event.clipboardData.getData("text/html");
        if (!html) return false;
        event.preventDefault();
        const hosts = editor.getRootElement()?.closest(".payload-editor")?.getAttribute("data-trusted-embed-hosts")?.split(",").filter(Boolean) ?? [];
        const cleanHtml = sanitizeAuthoredPostHtml(html, hosts);
        const parser = new DOMParser();
        const dom = parser.parseFromString(cleanHtml, "text/html");
        const dataImages = Array.from(dom.querySelectorAll<HTMLImageElement>('img[src^="data:"],img[src^="blob:"]'));
        if (dataImages.length > 0) {
          void uploadEmbeddedImages(editor, dom, dataImages, hosts);
          return true;
        }
        editor.update(() => $insertNodes($generateNodesFromDOM(editor, dom)));
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}

async function uploadPastedImages(editor: ReturnType<typeof useLexicalComposerContext>[0], files: File[]) {
  const uploaded: ImagePayload[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadFileAction(formData);
    if ("error" in result) {
      window.alert(result.error);
      return;
    }
    uploaded.push({ src: result.url, alt: file.name, title: file.name, kind: "local" });
  }
  editor.update(() => $insertNodes(uploaded.map($createImageNode)));
}

async function uploadEmbeddedImages(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  dom: Document,
  images: HTMLImageElement[],
  hosts: string[]
) {
  for (const [index, image] of images.entries()) {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const file = new File([blob], `pasted-image-${index + 1}.${blob.type.split("/")[1] || "png"}`, { type: blob.type || "image/png" });
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadFileAction(formData);
      if ("error" in result) throw new Error(result.error);
      image.src = result.url;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Pasted image upload failed.");
      return;
    }
  }
  const cleanHtml = sanitizeAuthoredPostHtml(dom.body.innerHTML, hosts);
  const cleanDom = new DOMParser().parseFromString(cleanHtml, "text/html");
  editor.update(() => $insertNodes($generateNodesFromDOM(editor, cleanDom)));
}

type HeadingTag = "h1" | "h2" | "h3";

export type RichTextEditorMode = "form" | "blocks" | "preview";

function setHeading(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  tag: HeadingTag
) {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createHeadingNode(tag));
    }
  });
}

function buildInitialEditorState(content: unknown, html?: string) {
  if (isHtmlSeed(content)) return undefined;
  if (content && typeof content === "object" && "root" in content)
    return JSON.stringify(content);
  if (html) return undefined;
  return JSON.stringify(emptyRichTextDocument);
}

function isHtmlSeed(
  content: unknown
): content is { format: "html"; html: string } {
  return Boolean(
    content &&
      typeof content === "object" &&
      "format" in content &&
      (content as any).format === "html"
  );
}

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  "INSERT_IMAGE_COMMAND"
);

export const INSERT_GALLERY_COMMAND: LexicalCommand<GalleryPayload> = createCommand("INSERT_GALLERY_COMMAND");
export const INSERT_CODE_BLOCK_COMMAND: LexicalCommand<CodeBlockPayload> = createCommand("INSERT_CODE_BLOCK_COMMAND");
export const INSERT_CUSTOM_HTML_COMMAND: LexicalCommand<{ source: string }> = createCommand("INSERT_CUSTOM_HTML_COMMAND");
export const INSERT_DIVIDER_COMMAND: LexicalCommand<void> = createCommand("INSERT_DIVIDER_COMMAND");

export type ImagePayload = {
  src: string;
  alt?: string | undefined;
  title?: string | undefined;
  caption?: string | undefined;
  link?: string | undefined;
  mediaAssetId?: string | undefined;
  kind?: "remote" | "local" | undefined;
};

type SerializedImageNode = {
  src: string;
  alt?: string | undefined;
  title?: string | undefined;
  caption?: string | undefined;
  link?: string | undefined;
  mediaAssetId?: string | undefined;
  kind?: "remote" | "local" | undefined;
} & SerializedLexicalNode;

export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __alt: string;
  __title: string;
  __caption: string;
  __link: string;
  __mediaAssetId: string | undefined;
  __kind: "remote" | "local";

  static getType() {
    return "image";
  }

  static clone(node: ImageNode) {
    return new ImageNode(
      {
        src: node.__src,
        alt: node.__alt,
        title: node.__title,
        caption: node.__caption,
        link: node.__link,
        ...(node.__mediaAssetId ? { mediaAssetId: node.__mediaAssetId } : {}),
        kind: node.__kind,
      },
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode) {
    return $createImageNode(serializedNode);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(payload: ImagePayload, key?: NodeKey) {
    super(key);
    this.__src = payload.src;
    this.__alt = payload.alt ?? "";
    this.__title = payload.title ?? "";
    this.__caption = payload.caption ?? "";
    this.__link = payload.link ?? "";
    this.__mediaAssetId = payload.mediaAssetId;
    this.__kind = payload.kind ?? "remote";
  }

  createDOM(_config: EditorConfig) {
    const span = document.createElement("span");
    span.className = "payload-editor-image";
    return span;
  }

  updateDOM() {
    return false;
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      alt: this.__alt,
      title: this.__title,
      caption: this.__caption,
      link: this.__link,
      kind: this.__kind,
      ...(this.__mediaAssetId ? { mediaAssetId: this.__mediaAssetId } : {}),
    };
  }

  exportDOM(): DOMExportOutput {
    const figure = document.createElement("figure");
    figure.className = "article-image";
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    if (this.__title) img.title = this.__title;
    if (this.__link) {
      const anchor = document.createElement("a");
      anchor.href = this.__link;
      anchor.append(img);
      figure.append(anchor);
    } else {
      figure.append(img);
    }
    if (this.__caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = this.__caption;
      figure.append(caption);
    }
    return { element: figure };
  }

  decorate() {
    return (
      <ImageBlock
        alt={this.__alt}
        caption={this.__caption}
        kind={this.__kind}
        link={this.__link}
        nodeKey={this.__key}
        src={this.__src}
        title={this.__title}
      />
    );
  }

  setAttributes(attributes: Partial<Pick<ImagePayload, "alt" | "caption" | "link" | "src" | "title">>) {
    const writable = this.getWritable();
    if (attributes.src !== undefined) writable.__src = attributes.src;
    if (attributes.alt !== undefined) writable.__alt = attributes.alt;
    if (attributes.title !== undefined) writable.__title = attributes.title;
    if (attributes.caption !== undefined) writable.__caption = attributes.caption;
    if (attributes.link !== undefined) writable.__link = attributes.link;
    return writable;
  }
}

function ImageBlock({
  src,
  alt,
  title,
  caption,
  link,
  kind,
  nodeKey
}: Required<Pick<ImagePayload, "src">> & Pick<ImagePayload, "alt" | "title" | "caption" | "link"> & { kind: "remote" | "local"; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const [selected, setSelected] = useState(false);

  function update(attributes: Partial<Pick<ImagePayload, "alt" | "caption" | "link" | "src" | "title">>) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof ImageNode) node.setAttributes(attributes);
    });
  }

  return (
    <figure className={`payload-editor-image-block ${selected ? "is-selected" : ""}`} contentEditable={false}>
      <button className="payload-editor-image-preview" onClick={() => { selectAtomicNode(editor, nodeKey); setSelected((value) => !value); }} type="button">
        <img alt={alt ?? ""} src={src} title={title} />
      </button>
      {caption && <figcaption>{caption}</figcaption>}
      {selected && editor.isEditable() && (
        <div className="payload-editor-atomic-settings">
          <label>Alt text<input defaultValue={alt ?? ""} onBlur={(event) => update({ alt: event.target.value })} /></label>
          <label>Caption<input defaultValue={caption ?? ""} onBlur={(event) => update({ caption: event.target.value })} /></label>
          <label>Link<input defaultValue={link ?? ""} onBlur={(event) => update({ link: event.target.value })} placeholder="https://" /></label>
          <label>Image URL<input defaultValue={src} onBlur={(event) => update({ src: event.target.value })} /></label>
          <small>{kind === "remote" ? "Remote image URL" : "Uploaded image"}</small>
        </div>
      )}
    </figure>
  );
}

function $createImageNode(payload: ImagePayload): ImageNode {
  return new ImageNode(payload);
}

function convertImageElement(domNode: Node): DOMConversionOutput | null {
  const img = domNode as HTMLImageElement;
  if (!img.src) return null;
  return {
    node: $createImageNode({
      src: img.src,
      alt: img.alt,
      title: img.title,
      caption: img.closest("figure")?.querySelector("figcaption")?.textContent ?? "",
      link: img.closest("a")?.href ?? "",
      kind: img.src.includes("/wp-content/uploads/") ? "remote" : "local",
    }),
  };
}

type GalleryItem = {
  src: string;
  alt: string;
  caption: string;
  link: string;
  kind: "remote" | "local";
};

export type GalleryPayload = {
  items: GalleryItem[];
  columns: 2 | 3 | 4;
};

type SerializedGalleryNode = GalleryPayload & SerializedLexicalNode;

export class GalleryNode extends DecoratorNode<ReactNode> {
  __items: GalleryItem[];
  __columns: 2 | 3 | 4;

  static getType() {
    return "gallery";
  }

  static clone(node: GalleryNode) {
    return new GalleryNode({ items: node.__items.map((item) => ({ ...item })), columns: node.__columns }, node.__key);
  }

  static importJSON(serializedNode: SerializedGalleryNode) {
    return $createGalleryNode(serializedNode);
  }

  constructor(payload: GalleryPayload, key?: NodeKey) {
    super(key);
    this.__items = payload.items.map((item) => ({ ...item }));
    this.__columns = payload.columns;
  }

  createDOM() {
    const div = document.createElement("div");
    div.className = "payload-editor-gallery-node";
    return div;
  }

  updateDOM() {
    return false;
  }

  exportJSON(): SerializedGalleryNode {
    return { type: "gallery", version: 1, items: this.__items.map((item) => ({ ...item })), columns: this.__columns };
  }

  exportDOM(): DOMExportOutput {
    const gallery = document.createElement("div");
    gallery.className = `article-gallery article-gallery--columns-${this.__columns}`;
    gallery.dataset.columns = String(this.__columns);
    for (const item of this.__items) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.alt;
      if (item.link) {
        const anchor = document.createElement("a");
        anchor.href = item.link;
        anchor.append(image);
        figure.append(anchor);
      } else {
        figure.append(image);
      }
      if (item.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = item.caption;
        figure.append(caption);
      }
      gallery.append(figure);
    }
    return { element: gallery };
  }

  decorate() {
    return <GalleryBlock columns={this.__columns} items={this.__items} nodeKey={this.__key} />;
  }

  setGallery(payload: GalleryPayload) {
    const writable = this.getWritable();
    writable.__items = payload.items.map((item) => ({ ...item }));
    writable.__columns = payload.columns;
    return writable;
  }
}

function GalleryBlock({ items, columns, nodeKey }: GalleryPayload & { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const editable = useEditorEditable(editor);
  const [selected, setSelected] = useState<number | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  function update(nextItems: GalleryItem[], nextColumns = columns) {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node instanceof GalleryNode) node.setGallery({ items: nextItems, columns: nextColumns });
    });
  }

  function patchItem(index: number, patch: Partial<GalleryItem>) {
    update(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function replaceWithFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || replaceIndex === null) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await uploadFileAction(data);
      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      patchItem(replaceIndex, { src: result.url, alt: file.name, kind: "local" });
    } finally {
      setUploading(false);
      setReplaceIndex(null);
      event.target.value = "";
    }
  }

  return (
    <div className="payload-editor-gallery-block" contentEditable={false}>
      <div className={`payload-editor-gallery-grid columns-${columns}`}>
        {items.map((item, index) => (
          <figure className={selected === index ? "is-selected" : ""} key={`${item.src}-${index}`}>
            <button onClick={() => { selectAtomicNode(editor, nodeKey); setSelected(selected === index ? null : index); }} type="button">
              <img alt={item.alt} src={item.src} />
            </button>
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </figure>
        ))}
      </div>
      {editable && (
        <div className="payload-editor-gallery-toolbar">
          <label>Columns
            <select onChange={(event) => update(items, Number(event.target.value) as 2 | 3 | 4)} value={columns}>
              <option value="2">2</option><option value="3">3</option><option value="4">4</option>
            </select>
          </label>
          <span>{items.length} images</span>
        </div>
      )}
      {editable && selected !== null && items[selected] && (
        <div className="payload-editor-atomic-settings">
          <label>Alt text<input defaultValue={items[selected].alt} onBlur={(event) => patchItem(selected, { alt: event.target.value })} /></label>
          <label>Caption<input defaultValue={items[selected].caption} onBlur={(event) => patchItem(selected, { caption: event.target.value })} /></label>
          <label>Link<input defaultValue={items[selected].link} onBlur={(event) => patchItem(selected, { link: event.target.value })} placeholder="https://" /></label>
          <label>Image URL<input defaultValue={items[selected].src} onBlur={(event) => patchItem(selected, { src: event.target.value, kind: "remote" })} /></label>
          <div className="payload-editor-atomic-actions">
            <button disabled={selected === 0} onClick={() => update(moveItem(items, selected, selected - 1))} type="button">Move left</button>
            <button disabled={selected === items.length - 1} onClick={() => update(moveItem(items, selected, selected + 1))} type="button">Move right</button>
            <button onClick={() => { setReplaceIndex(selected); replaceInputRef.current?.click(); }} type="button">{uploading ? "Uploading…" : "Replace"}</button>
            <button className="is-danger" onClick={() => { update(items.filter((_, index) => index !== selected)); setSelected(null); }} type="button">Remove</button>
          </div>
        </div>
      )}
      <input accept="image/*" onChange={replaceWithFile} ref={replaceInputRef} style={{ display: "none" }} type="file" />
    </div>
  );
}

type CodeBlockPayload = { code: string; language: string };
type SerializedCodeBlockNode = CodeBlockPayload & SerializedLexicalNode;

export class CodeBlockNode extends DecoratorNode<ReactNode> {
  __code: string;
  __language: string;

  static getType() { return "code-block"; }
  static clone(node: CodeBlockNode) { return new CodeBlockNode({ code: node.__code, language: node.__language }, node.__key); }
  static importJSON(node: SerializedCodeBlockNode) { return $createCodeBlockNode(node); }
  constructor(payload: CodeBlockPayload, key?: NodeKey) { super(key); this.__code = payload.code; this.__language = payload.language; }
  createDOM() { const div = document.createElement("div"); div.className = "payload-editor-code-node"; return div; }
  updateDOM() { return false; }
  exportJSON(): SerializedCodeBlockNode { return { type: "code-block", version: 1, code: this.__code, language: this.__language }; }
  exportDOM(): DOMExportOutput {
    const pre = document.createElement("pre");
    pre.className = "article-code";
    pre.dataset.language = this.__language;
    const code = document.createElement("code");
    code.textContent = this.__code;
    pre.append(code);
    return { element: pre };
  }
  decorate() { return <CodeBlock code={this.__code} language={this.__language} nodeKey={this.__key} />; }
  setCode(payload: CodeBlockPayload) { const node = this.getWritable(); node.__code = payload.code; node.__language = payload.language; return node; }
}

function CodeBlock({ code, language, nodeKey }: CodeBlockPayload & { nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const editable = useEditorEditable(editor);
  function update(payload: CodeBlockPayload) {
    editor.update(() => { const node = $getNodeByKey(nodeKey); if (node instanceof CodeBlockNode) node.setCode(payload); });
  }
  if (!editable) return <pre className="article-code"><code>{code}</code></pre>;
  return (
    <div className="payload-editor-code-block" contentEditable={false} onClick={() => selectAtomicNode(editor, nodeKey)}>
      <select onChange={(event) => update({ code, language: event.target.value })} value={language}>
        {['text', 'html', 'css', 'javascript', 'typescript', 'json', 'bash'].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <textarea onChange={(event) => update({ code: event.target.value, language })} spellCheck={false} value={code} />
    </div>
  );
}

type SerializedCustomHtmlNode = { source: string; sourceDirty?: boolean } & SerializedLexicalNode;

export class CustomHtmlNode extends DecoratorNode<ReactNode> {
  __source: string;
  __sourceDirty: boolean;
  static getType() { return "custom-html"; }
  static clone(node: CustomHtmlNode) { return new CustomHtmlNode(node.__source, node.__sourceDirty, node.__key); }
  static importJSON(node: SerializedCustomHtmlNode) { return $createCustomHtmlNode(node.source, node.sourceDirty ?? false); }
  constructor(source: string, sourceDirty = false, key?: NodeKey) { super(key); this.__source = source; this.__sourceDirty = sourceDirty; }
  createDOM() { const div = document.createElement("div"); div.className = "payload-editor-custom-html-node"; return div; }
  updateDOM() { return false; }
  exportJSON(): SerializedCustomHtmlNode { return { type: "custom-html", version: 1, source: this.__source, sourceDirty: this.__sourceDirty }; }
  exportDOM(): DOMExportOutput {
    if (!this.__sourceDirty) {
      const template = document.createElement("template");
      template.dataset.articlePreservedHtml = encodePreservedPostHtml(this.__source);
      return { element: template };
    }
    const wrapper = document.createElement("div");
    wrapper.className = "article-custom-html";
    wrapper.innerHTML = this.__source;
    return { element: wrapper };
  }
  decorate() { return <CustomHtmlBlock nodeKey={this.__key} source={this.__source} />; }
  setSource(source: string) { const node = this.getWritable(); node.__source = source; node.__sourceDirty = true; return node; }
}

function CustomHtmlBlock({ source, nodeKey }: { source: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext();
  const editable = useEditorEditable(editor);
  const [sourceMode, setSourceMode] = useState(false);
  const [draft, setDraft] = useState(source);
  const [error, setError] = useState("");
  const hosts = editor.getRootElement()?.closest(".payload-editor")?.getAttribute("data-trusted-embed-hosts")?.split(",").filter(Boolean) ?? [];
  const preview = sanitizeRichTextHtml(source, hosts);

  function saveSource() {
    const safe = sanitizeRichTextHtml(draft, hosts);
    if (safe !== draft) {
      setError("Scripts, inline events, unsafe URLs, or untrusted iframe hosts must be removed before saving this block.");
      return;
    }
    editor.update(() => { const node = $getNodeByKey(nodeKey); if (node instanceof CustomHtmlNode) node.setSource(draft); });
    setError("");
    setSourceMode(false);
  }

  return (
    <div className="payload-editor-custom-html" contentEditable={false} onClick={() => selectAtomicNode(editor, nodeKey)}>
      {sourceMode && editable ? (
        <>
          <textarea onChange={(event) => setDraft(event.target.value)} spellCheck={false} value={draft} />
          {error && <p className="payload-editor-block-error">{error}</p>}
          <div className="payload-editor-atomic-actions"><button onClick={() => setSourceMode(false)} type="button">Cancel</button><button onClick={saveSource} type="button">Apply HTML</button></div>
        </>
      ) : (
        <>
          <iframe sandbox="" srcDoc={preview} title="Custom HTML safe preview" />
          {editable && <button className="payload-editor-edit-html" onClick={() => { setDraft(source); setSourceMode(true); }} type="button">Edit HTML</button>}
        </>
      )}
    </div>
  );
}

type SerializedDividerNode = SerializedLexicalNode;

class DividerNode extends DecoratorNode<ReactNode> {
  static getType() { return "divider"; }
  static clone(node: DividerNode) { return new DividerNode(node.__key); }
  static importJSON(_node: SerializedDividerNode) { return $createDividerNode(); }
  createDOM() { const div = document.createElement("div"); div.className = "payload-editor-divider-node"; return div; }
  updateDOM() { return false; }
  exportJSON(): SerializedDividerNode { return { type: "divider", version: 1 }; }
  exportDOM(): DOMExportOutput { return { element: document.createElement("hr") }; }
  decorate() { return <hr className="article-divider" />; }
}

function $createGalleryNode(payload: GalleryPayload) { return new GalleryNode(payload); }
function $createCodeBlockNode(payload: CodeBlockPayload) { return new CodeBlockNode(payload); }
function $createCustomHtmlNode(source: string, sourceDirty = false) { return new CustomHtmlNode(source, sourceDirty); }
function $createDividerNode() { return new DividerNode(); }

function useEditorEditable(editor: ReturnType<typeof useLexicalComposerContext>[0]) {
  const [editable, setEditable] = useState(editor.isEditable());
  useEffect(() => editor.registerEditableListener(setEditable), [editor]);
  return editable;
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

function selectAtomicNode(editor: ReturnType<typeof useLexicalComposerContext>[0], key: NodeKey) {
  editor.update(() => {
    const selection = $createNodeSelection();
    selection.add(key);
    $setSelection(selection);
  });
}
