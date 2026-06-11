"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  INSERT_TABLE_COMMAND,
  TableCellHeaderStates
} from "@lexical/table";
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  KEY_DOWN_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type LexicalCommand,
  type LexicalNode
} from "lexical";
import { Braces, Code2, Minus, Quote, Table } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CodeBlockNode,
  CustomHtmlNode,
  GalleryNode,
  ImageNode,
  INSERT_CODE_BLOCK_COMMAND,
  INSERT_CUSTOM_HTML_COMMAND,
  INSERT_DIVIDER_COMMAND,
  type ImagePayload
} from "./RichTextEditor";

export function PostBlockModePlugins() {
  return (
    <>
      <SlashCommandPlugin />
      <BlockDragPlugin />
      <BlockInspectorPlugin />
    </>
  );
}

function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);

  useEffect(() => editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        return true;
      }
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return false;
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed() || selection.anchor.getNode().getTextContent().trim()) return false;
      event.preventDefault();
      setOpen(true);
      return true;
    },
    COMMAND_PRIORITY_EDITOR
  ), [editor, open]);

  if (!open) return null;
  return (
    <div className="payload-editor-slash-menu" role="menu">
      <button onClick={() => insertQuote(editor, setOpen)} type="button"><Quote size={15} />Quote</button>
      <button onClick={() => { editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: "3", columns: "2", includeHeaders: true }); setOpen(false); }} type="button"><Table size={15} />Table</button>
      <button onClick={() => insertAtomicBlock(editor, INSERT_DIVIDER_COMMAND, undefined, setOpen)} type="button"><Minus size={15} />Separator</button>
      <button onClick={() => insertAtomicBlock(editor, INSERT_CODE_BLOCK_COMMAND, { code: "", language: "text" }, setOpen)} type="button"><Code2 size={15} />Code</button>
      <button onClick={() => insertAtomicBlock(editor, INSERT_CUSTOM_HTML_COMMAND, { source: "<div></div>" }, setOpen)} type="button"><Braces size={15} />Custom HTML</button>
    </div>
  );
}

function BlockDragPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let rootElement: HTMLElement | null = null;
    let draggedKey = "";
    const decorateBlocks = () => {
      if (!rootElement) return;
      editor.getEditorState().read(() => {
        for (const node of $getRoot().getChildren()) {
          const element = editor.getElementByKey(node.getKey());
          if (!element) continue;
          element.draggable = true;
          element.dataset.lexicalBlockKey = node.getKey();
          element.title = "Drag to reorder block";
        }
      });
    };
    const onDragStart = (event: DragEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-lexical-block-key]") : null;
      if (!target?.dataset.lexicalBlockKey) return;
      draggedKey = target.dataset.lexicalBlockKey;
      target.classList.add("is-dragging");
      event.dataTransfer?.setData("text/x-lexical-block", draggedKey);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    };
    const onDragOver = (event: DragEvent) => {
      if (!draggedKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-lexical-block-key]") : null;
      if (!target || target.dataset.lexicalBlockKey === draggedKey) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    };
    const onDrop = (event: DragEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-lexical-block-key]") : null;
      const targetKey = target?.dataset.lexicalBlockKey;
      if (!draggedKey || !targetKey || draggedKey === targetKey) return;
      event.preventDefault();
      const placeAfter = Boolean(target && event.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2);
      editor.update(() => {
        const sourceNode = $getNodeByKey(draggedKey);
        const targetNode = $getNodeByKey(targetKey);
        if (!sourceNode || !targetNode) return;
        if (placeAfter) targetNode.insertAfter(sourceNode);
        else targetNode.insertBefore(sourceNode);
      });
    };
    const onDragEnd = () => {
      rootElement?.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
      draggedKey = "";
    };
    const unregisterRoot = editor.registerRootListener((nextRoot, previousRoot) => {
      previousRoot?.removeEventListener("dragstart", onDragStart);
      previousRoot?.removeEventListener("dragover", onDragOver);
      previousRoot?.removeEventListener("drop", onDrop);
      previousRoot?.removeEventListener("dragend", onDragEnd);
      rootElement = nextRoot;
      nextRoot?.addEventListener("dragstart", onDragStart);
      nextRoot?.addEventListener("dragover", onDragOver);
      nextRoot?.addEventListener("drop", onDrop);
      nextRoot?.addEventListener("dragend", onDragEnd);
      decorateBlocks();
    });
    const unregisterUpdate = editor.registerUpdateListener(() => queueMicrotask(decorateBlocks));
    return () => { unregisterRoot(); unregisterUpdate(); };
  }, [editor]);

  return null;
}

type BlockInspectorData =
  | { key: string; type: "image"; alt: string; caption: string; link: string; src: string }
  | { key: string; type: "gallery"; columns: 2 | 3 | 4; count: number }
  | { key: string; type: "code-block"; language: string }
  | { key: string; type: "custom-html" }
  | { key: string; type: "table" }
  | { key: string; type: "other"; blockType: string };

function BlockInspectorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [block, setBlock] = useState<BlockInspectorData | null>(null);

  useEffect(() => setTarget(document.getElementById("post-block-inspector")), []);
  useEffect(() => {
    const readSelection = () => editor.getEditorState().read(() => {
      const selection = $getSelection();
      const selectedNode = $isNodeSelection(selection) ? selection.getNodes()[0] : $isRangeSelection(selection) ? selection.anchor.getNode() : null;
      if (!selectedNode) return setBlock(null);
      let node: LexicalNode | null = selectedNode;
      while (node && node.getParent() && node.getParent()?.getType() !== "root" && !$isTableNode(node)) node = node.getParent();
      if ($isTableCellNode(selectedNode)) {
        let tableParent: LexicalNode | null = selectedNode;
        while (tableParent && !$isTableNode(tableParent)) tableParent = tableParent.getParent();
        if (tableParent) node = tableParent;
      }
      if (!node) return setBlock(null);
      if (node instanceof ImageNode) setBlock({ key: node.getKey(), type: "image", src: node.__src, alt: node.__alt, caption: node.__caption, link: node.__link });
      else if (node instanceof GalleryNode) setBlock({ key: node.getKey(), type: "gallery", columns: node.__columns, count: node.__items.length });
      else if (node instanceof CodeBlockNode) setBlock({ key: node.getKey(), type: "code-block", language: node.__language });
      else if (node instanceof CustomHtmlNode) setBlock({ key: node.getKey(), type: "custom-html" });
      else if ($isTableNode(node)) setBlock({ key: node.getKey(), type: "table" });
      else setBlock({ key: node.getKey(), type: "other", blockType: node.getType() });
    });
    readSelection();
    const unregisterSelection = editor.registerCommand(SELECTION_CHANGE_COMMAND, () => { readSelection(); return false; }, COMMAND_PRIORITY_EDITOR);
    const unregisterUpdate = editor.registerUpdateListener(({ tags }) => { if (!tags.has("html-seed")) readSelection(); });
    return () => { unregisterSelection(); unregisterUpdate(); };
  }, [editor]);

  if (!target) return null;
  return createPortal(<BlockInspector editor={editor} value={block} />, target);
}

function BlockInspector({ editor, value }: { editor: ReturnType<typeof useLexicalComposerContext>[0]; value: BlockInspectorData | null }) {
  if (!value) return <p className="payload-help-text">Select a block to edit its content settings.</p>;
  if (value.type === "image") {
    const update = (attributes: Partial<Pick<ImagePayload, "alt" | "caption" | "link" | "src">>) => editor.update(() => {
      const node = $getNodeByKey(value.key);
      if (node instanceof ImageNode) node.setAttributes(attributes);
    });
    return <div className="post-editor-inspector-fields"><InspectorHeading title="Image" description="Content attributes only" /><label>Alt text<input defaultValue={value.alt} onBlur={(event) => update({ alt: event.target.value })} /></label><label>Caption<input defaultValue={value.caption} onBlur={(event) => update({ caption: event.target.value })} /></label><label>Link<input defaultValue={value.link} onBlur={(event) => update({ link: event.target.value })} /></label><label>Image URL<input defaultValue={value.src} onBlur={(event) => update({ src: event.target.value })} /></label></div>;
  }
  if (value.type === "gallery") return <div className="post-editor-inspector-fields"><InspectorHeading description={`${value.count} images`} title="Gallery" /><label>Columns<select defaultValue={value.columns} onChange={(event) => editor.update(() => { const node = $getNodeByKey(value.key); if (node instanceof GalleryNode) node.setGallery({ items: node.__items, columns: Number(event.target.value) as 2 | 3 | 4 }); })}><option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option></select></label><p className="payload-help-text">Select an individual image in the article to edit its alt text, caption, link, order, or source.</p></div>;
  if (value.type === "code-block") return <div className="post-editor-inspector-fields"><InspectorHeading description="No syntax-highlighting dependency" title="Code" /><label>Language<select defaultValue={value.language} onChange={(event) => editor.update(() => { const node = $getNodeByKey(value.key); if (node instanceof CodeBlockNode) node.setCode({ code: node.__code, language: event.target.value }); })}>{['text', 'html', 'css', 'javascript', 'typescript', 'json', 'bash'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>;
  if (value.type === "table") return <div className="post-editor-inspector-fields"><InspectorHeading description="Basic table structure" title="Table" /><div className="post-editor-inspector-actions"><button onClick={() => editor.update(() => { $insertTableRowAtSelection(true); })} type="button">Add row</button><button onClick={() => editor.update(() => { $insertTableColumnAtSelection(true); })} type="button">Add column</button><button onClick={() => editor.update(() => { $deleteTableRowAtSelection(); })} type="button">Delete row</button><button onClick={() => editor.update(() => { $deleteTableColumnAtSelection(); })} type="button">Delete column</button><button onClick={() => toggleTableHeader(editor, value.key)} type="button">Toggle header row</button></div></div>;
  if (value.type === "custom-html") return <div className="post-editor-inspector-fields"><InspectorHeading description="Sandboxed preview; scripts never execute" title="Custom HTML" /><p className="payload-help-text">Use Edit HTML inside the block to change its source. Unsafe scripts, inline events, URLs, and untrusted embeds cannot be published.</p></div>;
  return <div className="post-editor-inspector-fields"><InspectorHeading description="This block has no additional content settings." title={humanizeBlockType(value.blockType)} /></div>;
}

function InspectorHeading({ title, description }: { title: string; description: string }) {
  return <div className="post-editor-inspector-heading"><strong>{title}</strong><span>{description}</span></div>;
}

function toggleTableHeader(editor: ReturnType<typeof useLexicalComposerContext>[0], key: string) {
  editor.update(() => {
    const table = $getNodeByKey(key);
    if (!$isTableNode(table)) return;
    const firstRow = table.getFirstChild();
    if (!$isTableRowNode(firstRow)) return;
    const cells = firstRow.getChildren().filter($isTableCellNode);
    const enabled = cells.some((cell) => cell.hasHeaderState(TableCellHeaderStates.ROW));
    cells.forEach((cell) => cell.setHeaderStyles(enabled ? TableCellHeaderStates.NO_STATUS : TableCellHeaderStates.ROW));
  });
}

function insertQuote(editor: ReturnType<typeof useLexicalComposerContext>[0], close: (open: boolean) => void) {
  editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode()); });
  close(false);
}

function insertAtomicBlock<T>(editor: ReturnType<typeof useLexicalComposerContext>[0], command: LexicalCommand<T>, payload: T, close: (open: boolean) => void) {
  editor.dispatchCommand(command, payload);
  close(false);
}

function humanizeBlockType(type: string) {
  return type.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
