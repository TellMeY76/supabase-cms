import { sanitizeAuthoredPostHtml } from "@/lib/post-editor";

export const BLOCKNOTE_SCHEMA_VERSION = 1;
export const BLOCKNOTE_MAX_BLOCKS = 1_000;
export const BLOCKNOTE_MAX_JSON_BYTES = 5 * 1024 * 1024;
export const BLOCKNOTE_MAX_HTML_BYTES = 5 * 1024 * 1024;
export const BLOCKNOTE_MAX_CUSTOM_HTML_BYTES = 500 * 1024;
export const BLOCKNOTE_MAX_TABLE_SIZE = 20;
export const BLOCKNOTE_MAX_GALLERY_IMAGES = 100;

export const POST_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "quote",
  "divider",
  "image",
  "gallery",
  "table",
  "codeBlock",
  "customHtml"
] as const;

export type PostBlockType = (typeof POST_BLOCK_TYPES)[number];

export type PostBlockNoteBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: PostBlockNoteBlock[];
};

export type PostBlockNoteDocument = {
  editor: "blocknote";
  schemaVersion: typeof BLOCKNOTE_SCHEMA_VERSION;
  blocks: PostBlockNoteBlock[];
};

export type PostBlockNoteValidationError = {
  code:
    | "invalid_document"
    | "invalid_block_props"
    | "unsupported_block"
    | "too_many_blocks"
    | "document_too_large"
    | "custom_html_too_large"
    | "html_too_large";
  message: string;
  blockId?: string;
};

const allowedTypes = new Set<string>(POST_BLOCK_TYPES);
const allowedAlignments = new Set(["left", "center", "right", "justify"]);
const allowedFontSizes = new Set(["12", "14", "16", "18", "20", "24", "28", "32", "40", "48"]);
const allowedSpaces = new Set(["0", "4", "8", "12", "16", "24", "32", "48", "64"]);
const allowedFonts = new Set(["sans", "serif", "mono"]);
const hexColor = /^#[0-9a-f]{6}$/i;

export function createBlockNoteDocument(blocks: PostBlockNoteBlock[]): PostBlockNoteDocument {
  return {
    editor: "blocknote",
    schemaVersion: BLOCKNOTE_SCHEMA_VERSION,
    blocks
  };
}

export function parseBlockNoteDocument(value: unknown): PostBlockNoteDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PostBlockNoteDocument>;
  if (
    candidate.editor !== "blocknote" ||
    candidate.schemaVersion !== BLOCKNOTE_SCHEMA_VERSION ||
    !Array.isArray(candidate.blocks)
  ) {
    return null;
  }
  return candidate as PostBlockNoteDocument;
}

export function validateBlockNoteDocument(value: unknown): {
  valid: boolean;
  errors: PostBlockNoteValidationError[];
} {
  const document = parseBlockNoteDocument(value);
  if (!document) {
    return {
      valid: false,
      errors: [{ code: "invalid_document", message: "The article editor data is not a supported BlockNote document." }]
    };
  }

  const errors: PostBlockNoteValidationError[] = [];
  const blocks = flattenBlocks(document.blocks);
  if (blocks.length > BLOCKNOTE_MAX_BLOCKS) {
    errors.push({
      code: "too_many_blocks",
      message: `Articles can contain at most ${BLOCKNOTE_MAX_BLOCKS} blocks.`
    });
  }

  if (byteLength(JSON.stringify(document)) > BLOCKNOTE_MAX_JSON_BYTES) {
    errors.push({
      code: "document_too_large",
      message: "The article editor data exceeds the 5 MB limit."
    });
  }

  for (const block of blocks) {
    if (!allowedTypes.has(block.type)) {
      errors.push({
        blockId: block.id,
        code: "unsupported_block",
        message: `The ${block.type} block is not available in article posts.`
      });
      continue;
    }
    if (!hasValidArticleProps(block.props)) {
      errors.push({
        blockId: block.id,
        code: "invalid_block_props",
        message: "The block contains unsupported article style settings."
      });
    }
    if (block.type === "heading" && ![1, 2, 3, 4, 5, 6].includes(Number(block.props?.level))) {
      errors.push({
        blockId: block.id,
        code: "invalid_block_props",
        message: "Article headings must use levels 1 through 6."
      });
    }
    if (block.type === "table" && !isValidTableContent(block.content)) {
      errors.push({
        blockId: block.id,
        code: "invalid_block_props",
        message: "The table block contains invalid row or cell data."
      });
    }
    if (block.type === "image" && !isValidImageProps(block.props)) {
      errors.push({
        blockId: block.id,
        code: "invalid_block_props",
        message: "The image block contains an invalid URL or image setting."
      });
    }
    if (block.type === "gallery" && !isValidGalleryProps(block.props)) {
      errors.push({
        blockId: block.id,
        code: "invalid_block_props",
        message: `Galleries can contain at most ${BLOCKNOTE_MAX_GALLERY_IMAGES} valid images.`
      });
    }
    if (
      block.type === "customHtml" &&
      byteLength(stringProp(block.props, "source")) > BLOCKNOTE_MAX_CUSTOM_HTML_BYTES
    ) {
      errors.push({
        blockId: block.id,
        code: "custom_html_too_large",
        message: "A custom HTML block exceeds the 500 KB limit."
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function serializeBlockNoteDocumentToHtml(
  value: unknown,
  allowedIframeHosts: string[] = []
): string {
  const document = parseBlockNoteDocument(value);
  if (!document) throw new Error("The article content is not valid BlockNote data.");

  const validation = validateBlockNoteDocument(document);
  if (!validation.valid) throw new Error(validation.errors[0]?.message ?? "The article content is invalid.");

  const html = document.blocks.map((block) => serializeBlock(block, allowedIframeHosts)).join("");
  if (byteLength(html) > BLOCKNOTE_MAX_HTML_BYTES) {
    throw new Error("The generated article HTML exceeds the 5 MB limit.");
  }
  return html;
}

function serializeBlock(block: PostBlockNoteBlock, allowedIframeHosts: string[]): string {
  const props = block.props ?? {};
  const attributes = serializeBlockAttributes(props);
  const content = serializeInlineContent(block.content);
  const children = (block.children ?? []).map((child) => serializeBlock(child, allowedIframeHosts)).join("");

  switch (block.type) {
    case "paragraph":
      return `<p${attributes}>${content || "<br>"}</p>${children}`;
    case "heading": {
      const level = clampHeadingLevel(props.level);
      return `<h${level}${attributes}>${content}</h${level}>${children}`;
    }
    case "bulletListItem":
      return `<ul${attributes}><li>${content}${children}</li></ul>`;
    case "numberedListItem":
      return `<ol${attributes}><li>${content}${children}</li></ol>`;
    case "quote":
      return `<blockquote${attributes}>${content}${children}</blockquote>`;
    case "divider":
      return `<hr${attributes}>`;
    case "image":
      return serializeImage(props, attributes);
    case "gallery":
      return serializeGallery(props, attributes);
    case "table":
      return serializeTable(block.content, props, attributes);
    case "codeBlock":
      return serializeCode(props, content, attributes);
    case "customHtml": {
      const source = stringProp(props, "source");
      return booleanProp(props, "sourceDirty")
        ? `<div class="article-custom-html">${sanitizeAuthoredPostHtml(source, allowedIframeHosts)}</div>`
        : source;
    }
    default:
      return "";
  }
}

function serializeInlineContent(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map(serializeInlineNode).join("");
}

function serializeInlineNode(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as Record<string, unknown>;
  if (node.type === "link") {
    const href = safeHref(typeof node.href === "string" ? node.href : "");
    return `<a href="${escapeAttribute(href)}">${serializeInlineContent(node.content)}</a>`;
  }
  if (node.type !== "text" || typeof node.text !== "string") return "";

  let content = escapeHtml(node.text).replace(/\n/g, "<br>");
  const styles = node.styles && typeof node.styles === "object" ? (node.styles as Record<string, unknown>) : {};
  const styleVariables: string[] = [];
  if (typeof styles.articleTextColor === "string" && hexColor.test(styles.articleTextColor)) {
    styleVariables.push(`--article-text-color:${styles.articleTextColor.toUpperCase()}`);
  }
  if (typeof styles.articleHighlightColor === "string" && hexColor.test(styles.articleHighlightColor)) {
    styleVariables.push(`--article-highlight-color:${styles.articleHighlightColor.toUpperCase()}`);
  }
  const wrappers = [
    styles.code === true ? "code" : "",
    styles.underline === true ? "u" : "",
    styles.strike === true ? "s" : "",
    styles.italic === true ? "em" : "",
    styles.bold === true ? "strong" : ""
  ].filter(Boolean);
  wrappers.forEach((tag, index) => {
    const style = index === wrappers.length - 1 && styleVariables.length > 0
      ? ` style="${styleVariables.join(";")}"`
      : "";
    content = `<${tag}${style}>${content}</${tag}>`;
  });
  if (wrappers.length === 0 && styleVariables.length > 0) {
    content = `<span style="${styleVariables.join(";")}">${content}</span>`;
  }
  return content;
}

function serializeBlockAttributes(props: Record<string, unknown>) {
  const classes: string[] = [];
  const styles: string[] = [];
  const alignment = stringProp(props, "textAlignment");
  const font = stringProp(props, "articleFont");
  const size = stringProp(props, "articleFontSize");
  const marginTop = stringProp(props, "articleMarginTop");
  const marginBottom = stringProp(props, "articleMarginBottom");
  const padding = stringProp(props, "articlePadding");
  const background = stringProp(props, "articleBackgroundColor") || stringProp(props, "backgroundColor");

  if (allowedAlignments.has(alignment)) classes.push(`article-align-${alignment}`);
  if (allowedFonts.has(font)) classes.push(`article-font-${font}`);
  if (allowedFontSizes.has(size)) classes.push(`article-size-${size}`);
  if (allowedSpaces.has(marginTop)) classes.push(`article-space-top-${marginTop}`);
  if (allowedSpaces.has(marginBottom)) classes.push(`article-space-bottom-${marginBottom}`);
  if (allowedSpaces.has(padding)) classes.push(`article-padding-${padding}`);
  if (hexColor.test(background)) styles.push(`--article-background-color:${background.toUpperCase()}`);

  return `${classes.length > 0 ? ` class="${classes.join(" ")}"` : ""}${styles.length > 0 ? ` style="${styles.join(";")}"` : ""}`;
}

function serializeImage(props: Record<string, unknown>, attributes: string) {
  const src = safeMediaUrl(stringProp(props, "url") || stringProp(props, "src"));
  if (!src) return "";
  const alt = escapeAttribute(stringProp(props, "name") || stringProp(props, "alt"));
  const caption = stringProp(props, "caption");
  const link = safeHref(stringProp(props, "link"));
  const width = stringProp(props, "articleWidth");
  const previewWidth = numberProp(props, "previewWidth");
  const widthClass = new Set(["25", "50", "75", "100"]).has(width) ? ` article-image-width-${width}` : "";
  const widthAttribute = previewWidth >= 32 && previewWidth <= 2_000 ? ` width="${previewWidth}"` : "";
  if (props.showPreview === false) {
    return `<p${attributes}><a href="${escapeAttribute(src)}">${alt || escapeHtml(src)}</a></p>`;
  }
  const image = `<img alt="${alt}" src="${escapeAttribute(src)}"${widthAttribute}>`;
  const linkedImage = link ? `<a href="${escapeAttribute(link)}">${image}</a>` : image;
  return `<figure${appendClass(attributes, `article-image${widthClass}`)}>${linkedImage}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
}

function serializeGallery(props: Record<string, unknown>, attributes: string) {
  const columns = [2, 3, 4].includes(numberProp(props, "columns")) ? numberProp(props, "columns") : 3;
  const items = parseJsonArray(stringProp(props, "items"));
  const figures = items.map((item) => {
    if (!item || typeof item !== "object") return "";
    const source = item as Record<string, unknown>;
    const src = safeMediaUrl(typeof source.src === "string" ? source.src : "");
    if (!src) return "";
    const alt = typeof source.alt === "string" ? source.alt : "";
    const caption = typeof source.caption === "string" ? source.caption : "";
    const link = safeHref(typeof source.link === "string" ? source.link : "");
    const image = `<img alt="${escapeAttribute(alt)}" src="${escapeAttribute(src)}">`;
    return `<figure>${link ? `<a href="${escapeAttribute(link)}">${image}</a>` : image}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
  }).join("");
  return `<div${appendClass(attributes, `article-gallery article-gallery--columns-${columns}`)} data-columns="${columns}">${figures}</div>`;
}

function serializeTable(content: unknown, props: Record<string, unknown>, attributes: string) {
  const rows = getTableRows(content);
  const header = getTableHeaderRows(content) > 0 || booleanProp(props, "headerRow");
  const body = rows.map((row, rowIndex) => {
    const tag = header && rowIndex === 0 ? "th" : "td";
    return `<tr>${row.map((cell) => `<${tag}>${serializeInlineContent(cell)}</${tag}>`).join("")}</tr>`;
  }).join("");
  return `<div class="article-table-scroll"><table${attributes}>${body}</table></div>`;
}

function getTableHeaderRows(content: unknown) {
  if (!content || typeof content !== "object") return 0;
  const value = Number((content as Record<string, unknown>).headerRows);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function isValidTableContent(content: unknown) {
  if (!content || typeof content !== "object") return false;
  const candidate = content as Record<string, unknown>;
  if (candidate.type !== "tableContent" || !Array.isArray(candidate.rows)) return false;
  if (candidate.rows.length < 1 || candidate.rows.length > BLOCKNOTE_MAX_TABLE_SIZE) return false;
  const headerRows = Number(candidate.headerRows ?? 0);
  if (!Number.isInteger(headerRows) || headerRows < 0 || headerRows > 1) return false;
  let columnCount = 0;
  return candidate.rows.every((row, rowIndex) => {
    if (!row || typeof row !== "object") return false;
    const cells = (row as Record<string, unknown>).cells;
    if (!Array.isArray(cells) || cells.length < 1 || cells.length > BLOCKNOTE_MAX_TABLE_SIZE) return false;
    if (rowIndex === 0) columnCount = cells.length;
    if (cells.length !== columnCount) return false;
    return cells.every((cell) => Array.isArray(cell));
  });
}

function hasValidArticleProps(props: Record<string, unknown> | undefined) {
  if (!props) return true;
  const font = stringProp(props, "articleFont");
  const size = stringProp(props, "articleFontSize");
  const marginTop = stringProp(props, "articleMarginTop");
  const marginBottom = stringProp(props, "articleMarginBottom");
  const padding = stringProp(props, "articlePadding");
  const background = stringProp(props, "articleBackgroundColor");
  return (
    (!font || allowedFonts.has(font)) &&
    (!size || allowedFontSizes.has(size)) &&
    (!marginTop || allowedSpaces.has(marginTop)) &&
    (!marginBottom || allowedSpaces.has(marginBottom)) &&
    (!padding || allowedSpaces.has(padding)) &&
    (!background || hexColor.test(background))
  );
}

function isValidImageProps(props: Record<string, unknown> | undefined) {
  if (!props) return false;
  const sourceType = stringProp(props, "sourceType");
  const width = stringProp(props, "articleWidth");
  const link = stringProp(props, "link");
  const previewWidth = numberProp(props, "previewWidth");
  return (
    Boolean(safeMediaUrl(stringProp(props, "url") || stringProp(props, "src"))) &&
    (!sourceType || sourceType === "local" || sourceType === "remote") &&
    (!width || new Set(["25", "50", "75", "100"]).has(width)) &&
    (!link || Boolean(safeHref(link))) &&
    (!previewWidth || (Number.isInteger(previewWidth) && previewWidth >= 32 && previewWidth <= 2_000)) &&
    (props.showPreview === undefined || typeof props.showPreview === "boolean")
  );
}

function isValidGalleryProps(props: Record<string, unknown> | undefined) {
  if (!props) return false;
  const columns = numberProp(props, "columns");
  const items = parseJsonArray(stringProp(props, "items"));
  if (![2, 3, 4].includes(columns) || items.length > BLOCKNOTE_MAX_GALLERY_IMAGES) return false;
  return items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Record<string, unknown>;
    const src = typeof entry.src === "string" ? entry.src : "";
    const link = typeof entry.link === "string" ? entry.link : "";
    const sourceType = typeof entry.sourceType === "string" ? entry.sourceType : "";
    return (
      Boolean(safeMediaUrl(src)) &&
      (!link || Boolean(safeHref(link))) &&
      (!sourceType || sourceType === "local" || sourceType === "remote")
    );
  });
}

function getTableRows(content: unknown): unknown[][] {
  if (!content || typeof content !== "object") return [];
  const candidate = content as Record<string, unknown>;
  const rows = Array.isArray(candidate.rows) ? candidate.rows : [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return [];
    const cells = (row as Record<string, unknown>).cells;
    return Array.isArray(cells) ? cells : [];
  });
}

function serializeCode(props: Record<string, unknown>, content: string, attributes: string) {
  const language = stringProp(props, "language").replace(/[^a-z0-9_-]/gi, "") || "text";
  const code = stringProp(props, "code") || stripHtml(content);
  return `<pre${appendClass(attributes, "article-code")} data-language="${escapeAttribute(language)}"><code>${escapeHtml(code)}</code></pre>`;
}

function appendClass(attributes: string, className: string) {
  if (!attributes.includes(' class="')) return `${attributes} class="${className}"`;
  return attributes.replace(' class="', ` class="${className} `);
}

function clampHeadingLevel(value: unknown) {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2;
}

function flattenBlocks(blocks: PostBlockNoteBlock[]): PostBlockNoteBlock[] {
  return blocks.flatMap((block) => [block, ...flattenBlocks(Array.isArray(block.children) ? block.children : [])]);
}

function stringProp(props: Record<string, unknown> | undefined, key: string) {
  const value = props?.[key];
  return typeof value === "string" ? value : "";
}

function booleanProp(props: Record<string, unknown>, key: string) {
  return props[key] === true;
}

function numberProp(props: Record<string, unknown>, key: string) {
  return typeof props[key] === "number" ? props[key] : Number(props[key]);
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeHref(value: string) {
  if (!value) return "";
  const normalized = value.trim();
  if (/^(?:https?:|mailto:|tel:|\/|#)/i.test(normalized)) return normalized;
  return "";
}

function safeMediaUrl(value: string) {
  if (!value) return "";
  const normalized = value.trim();
  return /^(?:https?:|\/)/i.test(normalized) ? normalized : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
