import { describe, expect, it } from "vitest";
import {
  encodePreservedPostHtml,
  isMeaningfulRichText,
  normalizePostsReturnTo,
  resolvePostStatus,
  sanitizeAuthoredPostHtml,
  sanitizeEditedPostHtml,
  sanitizePostEditorDocument,
  sanitizeRichTextHtml,
  shouldWritePostContent,
  withAdminNotice
} from "@/lib/post-editor";

describe("post editor compatibility rules", () => {
  it("does not rewrite existing content unless the body changed", () => {
    expect(shouldWritePostContent({ contentDirty: false, isNewPost: false })).toBe(false);
    expect(shouldWritePostContent({ contentDirty: true, isNewPost: false })).toBe(true);
    expect(shouldWritePostContent({ contentDirty: false, isNewPost: true })).toBe(true);
  });

  it("maps explicit actions to an unambiguous status", () => {
    expect(resolvePostStatus("draft", "published")).toBe("draft");
    expect(resolvePostStatus("publish", "draft")).toBe("published");
    expect(resolvePostStatus("update", "published")).toBe("published");
    expect(resolvePostStatus("restore", "archived")).toBe("draft");
  });

  it("only permits returns to the posts list", () => {
    expect(normalizePostsReturnTo("/admin/posts?page=3")).toBe("/admin/posts?page=3");
    expect(normalizePostsReturnTo("/admin/products")).toBe("/admin/posts");
    expect(normalizePostsReturnTo("https://evil.example/admin/posts")).toBe("/admin/posts");
    expect(withAdminNotice("/admin/posts?page=2", "success", "Saved")).toBe("/admin/posts?page=2&success=Saved");
  });

  it("recognizes text and media as publishable content", () => {
    expect(isMeaningfulRichText("<p>Article</p>")).toBe(true);
    expect(isMeaningfulRichText('<img src="https://example.com/image.jpg">')).toBe(true);
    expect(isMeaningfulRichText("<p>&nbsp;</p>")).toBe(false);
  });

  it("filters executable HTML while preserving trusted embeds", () => {
    const html = [
      '<p onclick="alert(1)">Hello</p>',
      '<script>alert(1)</script>',
      '<a href="javascript:alert(1)">Bad link</a>',
      '<a href="jav&#x61;script:alert(1)">Encoded bad link</a>',
      '<iframe srcdoc="<script>alert(1)</script>" src="https://www.youtube.com/embed/abc"></iframe>',
      '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
      '<iframe src="https://evil.example/embed/abc"></iframe>'
    ].join("");
    const result = sanitizeRichTextHtml(html, ["www.youtube.com"]);

    expect(result).toContain("Hello");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("srcdoc");
    expect(result).toContain("www.youtube.com");
    expect(result).not.toContain("evil.example");
  });

  it("cleans pasted visual styles while preserving project article classes", () => {
    const result = sanitizeAuthoredPostHtml('<p class="MsoNormal article-note" style="color:red;width:100px"><font face="Arial">Text</font></p>');
    expect(result).toBe('<p class="article-note">Text</p>');
  });

  it("sanitizes custom HTML stored inside editor JSON", () => {
    const result = sanitizePostEditorDocument({ root: { children: [{ type: "custom-html", sourceDirty: true, source: '<div onclick="bad()">Safe<script>bad()</script></div>' }] } });
    expect(JSON.stringify(result)).not.toContain("onclick");
    expect(JSON.stringify(result)).not.toContain("script");
  });

  it("restores untouched legacy custom HTML byte for byte", () => {
    const encoded = encodePreservedPostHtml('<div style="color:red"><script>legacy()</script></div>');
    const html = `<p>Edited paragraph</p><template data-article-preserved-html="${encoded}"></template>`;
    expect(sanitizeEditedPostHtml(html)).toContain('<div style="color:red"><script>legacy()</script></div>');
  });
});
