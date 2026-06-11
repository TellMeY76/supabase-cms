import type { PublishStatus } from "@global-trade/core";

export type PostSaveIntent = "draft" | "publish" | "update" | "archive" | "restore";

export function shouldWritePostContent({
  contentDirty,
  isNewPost
}: {
  contentDirty: boolean;
  isNewPost: boolean;
}) {
  return isNewPost || contentDirty;
}

export function resolvePostStatus(intent: PostSaveIntent, currentStatus: PublishStatus): PublishStatus {
  if (intent === "draft" || intent === "restore") return "draft";
  if (intent === "publish") return "published";
  if (intent === "archive") return "archived";
  return currentStatus;
}

export function postSaveMessage(intent: PostSaveIntent, status: PublishStatus) {
  if (intent === "draft") return "Post draft saved.";
  if (intent === "publish") return "Post published.";
  if (intent === "archive") return "Post archived.";
  if (intent === "restore") return "Post restored to draft.";
  return status === "published" ? "Post updated." : "Post saved.";
}

export function normalizePostsReturnTo(value: string | undefined) {
  if (!value) return "/admin/posts";
  if (!value.startsWith("/admin/posts")) return "/admin/posts";
  if (value.startsWith("//") || value.includes("\\")) return "/admin/posts";

  try {
    const parsed = new URL(value, "https://admin.local");
    if (parsed.origin !== "https://admin.local") return "/admin/posts";
    if (parsed.pathname !== "/admin/posts") return "/admin/posts";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/admin/posts";
  }
}

export function withAdminNotice(returnTo: string, kind: "error" | "success", message: string) {
  const parsed = new URL(normalizePostsReturnTo(returnTo), "https://admin.local");
  parsed.searchParams.delete("error");
  parsed.searchParams.delete("success");
  parsed.searchParams.set(kind, message);
  return `${parsed.pathname}${parsed.search}`;
}

export function isMeaningfulRichText(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(?:img|iframe|table|pre|hr)\b[^>]*>/gi, "content")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0;
}

export function trustedEmbedHosts(value = process.env.TRUSTED_EMBED_HOSTS ?? "") {
  return value
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function sanitizeRichTextHtml(html: string, allowedIframeHosts = trustedEmbedHosts()) {
  let output = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<(?:object|applet)\b[^>]*>[\s\S]*?<\/(?:object|applet)\s*>/gi, "")
    .replace(/<\/?(?:embed|base|meta|link)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z][\w:-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*(["'])(.*?)\1/gi, (match, _quote: string, style: string) =>
      /expression\s*\(|url\s*\(\s*["']?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(style) ? "" : match
    );

  output = output.replace(
    /\s+(href|src|poster|action|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (_match, attribute: string, doubleQuoted: string | undefined, singleQuoted: string | undefined, unquoted: string | undefined) => {
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
      if (!isSafeContentUrl(attribute.toLowerCase(), value)) {
        return attribute.toLowerCase() === "href" ? ' href="#"' : "";
      }
      return ` ${attribute}="${escapeHtmlAttribute(value)}"`;
    }
  );

  output = output.replace(/<iframe\b([^>]*)>([\s\S]*?)<\/iframe\s*>/gi, (match, attributes: string) => {
    const srcMatch = attributes.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    if (!srcMatch) return "";

    const src = srcMatch[2];
    if (!src) return "";

    try {
      const url = new URL(src);
      if (url.protocol !== "https:" || !allowedIframeHosts.includes(url.hostname.toLowerCase())) {
        return "";
      }
    } catch {
      return "";
    }

    return match;
  });

  return output;
}

function isSafeContentUrl(attribute: string, value: string) {
  const normalized = decodeUrlForSafety(value)
    .replace(/[\u0000-\u0020\u007f]+/g, "")
    .toLowerCase();
  if (!normalized || normalized.startsWith("#") || normalized.startsWith("/") || normalized.startsWith("./") || normalized.startsWith("../")) {
    return true;
  }
  if (normalized.startsWith("https://") || normalized.startsWith("http://")) return true;
  if (attribute === "href" && (normalized.startsWith("mailto:") || normalized.startsWith("tel:"))) return true;
  if ((attribute === "src" || attribute === "poster") && (normalized.startsWith("blob:") || normalized.startsWith("data:image/"))) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(normalized);
}

function decodeUrlForSafety(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);?/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&colon;/gi, ":")
    .replace(/&(tab|newline);/gi, "");
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function sanitizeAuthoredPostHtml(html: string, allowedIframeHosts = trustedEmbedHosts()) {
  return sanitizeRichTextHtml(html, allowedIframeHosts)
    .replace(/<\/?(?:font|o:p|w:[^>\s]+|v:[^>\s]+)\b[^>]*>/gi, "")
    .replace(/\s+(?:style|color|bgcolor|width|height|face|size)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+class\s*=\s*(["'])(.*?)\1/gi, (_match, quote: string, className: string) => {
      const allowed = className
        .split(/\s+/)
        .filter((token) => /^article-[a-z0-9_-]+$/i.test(token));
      return allowed.length > 0 ? ` class=${quote}${allowed.join(" ")}${quote}` : "";
    })
    .replace(/<p>\s*<\/p>/gi, "");
}

export function encodePreservedPostHtml(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodePreservedPostHtml(value: string) {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function sanitizeEditedPostHtml(html: string, allowedIframeHosts = trustedEmbedHosts()) {
  const clean = sanitizeAuthoredPostHtml(html, allowedIframeHosts);
  return clean.replace(
    /<template\s+data-article-preserved-html=(["'])([A-Za-z0-9+/=]+)\1\s*><\/template>/gi,
    (_match, _quote: string, encoded: string) => decodePreservedPostHtml(encoded)
  );
}

export function containsUnsafePostHtml(html: string, allowedIframeHosts = trustedEmbedHosts()) {
  return sanitizeRichTextHtml(html, allowedIframeHosts) !== html;
}

export function sanitizePostEditorDocument(value: unknown, allowedIframeHosts = trustedEmbedHosts()): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizePostEditorDocument(item, allowedIframeHosts));
  if (!value || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      key === "source" &&
      (value as { type?: unknown; sourceDirty?: unknown }).type === "custom-html" &&
      (value as { sourceDirty?: unknown }).sourceDirty === true &&
      typeof item === "string"
    ) {
      result[key] = sanitizeAuthoredPostHtml(item, allowedIframeHosts);
    } else {
      result[key] = sanitizePostEditorDocument(item, allowedIframeHosts);
    }
  }
  return result;
}
