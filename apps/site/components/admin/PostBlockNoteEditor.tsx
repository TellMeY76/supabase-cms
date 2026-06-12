"use client";

import type { RichTextEditorMode } from "./RichTextEditor";
import { PostBlockNoteEditorClient } from "./PostBlockNoteEditorClient";

export type PostBlockNoteEditorProps = {
  initialContent?: unknown;
  initialHtml?: string;
  previewExcerpt?: string;
  previewFeaturedImage?: string;
  previewTitle?: string;
  mode?: RichTextEditorMode;
  name: string;
  onDirtyChange?: (dirty: boolean) => void;
  trustedEmbedHosts?: string[];
};

export function PostBlockNoteEditor(props: PostBlockNoteEditorProps) {
  return <PostBlockNoteEditorClient {...props} />;
}
