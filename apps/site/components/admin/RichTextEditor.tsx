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
import { $createHeadingNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
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
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isTextNode,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  DecoratorNode,
  FORMAT_TEXT_COMMAND,
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
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Redo2,
  Table,
  Undo2,
} from "lucide-react";
import { uploadFileAction } from "@/app/(admin)/admin/upload-action";
import { emptyRichTextDocument } from "@/lib/rich-text";

export function RichTextEditor({
  name,
  htmlName = "contentHtml",
  initialContent,
  initialHtml,
}: {
  name: string;
  htmlName?: string;
  initialContent?: unknown;
  initialHtml?: string;
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
      <div className="payload-editor">
        <input
          name={name}
          type="hidden"
          defaultValue={JSON.stringify(initialContent ?? emptyRichTextDocument)}
        />
        <input name={htmlName} type="hidden" defaultValue={initialHtml ?? ""} />
        <Toolbar />
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
        <SyncPlugin jsonName={name} htmlName={htmlName} />
        <HtmlSeedPlugin
          html={isHtmlSeed(initialContent) ? initialContent.html : ""}
        />
      </div>
    </LexicalComposer>
  );
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    </div>
  );
}

function SyncPlugin({
  jsonName,
  htmlName,
}: {
  jsonName: string;
  htmlName: string;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <OnChangePlugin
      onChange={editorState => {
        const jsonField = document.querySelector<HTMLInputElement>(
          `input[name="${jsonName}"]`
        );
        const htmlField = document.querySelector<HTMLInputElement>(
          `input[name="${htmlName}"]`
        );
        if (jsonField) jsonField.value = JSON.stringify(editorState.toJSON());
        if (htmlField) {
          editorState.read(() => {
            htmlField.value = $generateHtmlFromNodes(editor);
          });
        }
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
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
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
    });
  }, [editor, html]);
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

type HeadingTag = "h1" | "h2" | "h3";

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

type ImagePayload = {
  src: string;
  alt?: string | undefined;
  title?: string | undefined;
  mediaAssetId?: string | undefined;
  kind?: "remote" | "local" | undefined;
};

type SerializedImageNode = {
  src: string;
  alt?: string | undefined;
  title?: string | undefined;
  mediaAssetId?: string | undefined;
  kind?: "remote" | "local" | undefined;
} & SerializedLexicalNode;

class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __alt: string;
  __title: string;
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
      kind: this.__kind,
      ...(this.__mediaAssetId ? { mediaAssetId: this.__mediaAssetId } : {}),
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__alt;
    if (this.__title) img.title = this.__title;
    return { element: img };
  }

  decorate() {
    return <img src={this.__src} alt={this.__alt} title={this.__title} />;
  }
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
      kind: img.src.includes("/wp-content/uploads/") ? "remote" : "local",
    }),
  };
}
