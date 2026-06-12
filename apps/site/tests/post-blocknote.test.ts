import { describe, expect, it } from "vitest";
import {
  BLOCKNOTE_MAX_TABLE_SIZE,
  BLOCKNOTE_SCHEMA_VERSION,
  createBlockNoteDocument,
  parseBlockNoteDocument,
  serializeBlockNoteDocumentToHtml,
  validateBlockNoteDocument
} from "@/lib/post-blocknote";

describe("BlockNote post document contract", () => {
  it("wraps blocks in a versioned project envelope", () => {
    const document = createBlockNoteDocument([
      {
        id: "paragraph-1",
        type: "paragraph",
        props: {},
        content: [{ type: "text", text: "Hello", styles: {} }],
        children: []
      }
    ]);

    expect(document).toMatchObject({
      editor: "blocknote",
      schemaVersion: BLOCKNOTE_SCHEMA_VERSION
    });
    expect(document.blocks).toHaveLength(1);
    expect(parseBlockNoteDocument(document)).toEqual(document);
  });

  it("rejects documents outside the article block whitelist", () => {
    const document = createBlockNoteDocument([
      {
        id: "video-1",
        type: "video",
        props: {},
        content: [],
        children: []
      }
    ]);

    expect(validateBlockNoteDocument(document)).toEqual({
      valid: false,
      errors: [expect.objectContaining({ blockId: "video-1", code: "unsupported_block" })]
    });
  });

  it("supports heading levels one through six and rejects levels outside that range", () => {
    const supported = createBlockNoteDocument(
      Array.from({ length: 6 }, (_, index) => ({
        id: `heading-${index + 1}`,
        type: "heading",
        props: { level: index + 1 },
        content: [{ type: "text", text: `Heading ${index + 1}`, styles: {} }],
        children: []
      }))
    );

    expect(validateBlockNoteDocument(supported)).toEqual({ valid: true, errors: [] });
    expect(serializeBlockNoteDocumentToHtml(supported)).toBe(
      "<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5><h6>Heading 6</h6>"
    );

    const unsupported = createBlockNoteDocument([
      {
        id: "heading-7",
        type: "heading",
        props: { level: 7 },
        content: [{ type: "text", text: "Heading 7", styles: {} }],
        children: []
      }
    ]);

    expect(validateBlockNoteDocument(unsupported)).toEqual({
      valid: false,
      errors: [expect.objectContaining({ blockId: "heading-7", code: "invalid_block_props" })]
    });
  });

  it("rejects malformed tables", () => {
    const document = createBlockNoteDocument([
      {
        id: "table-1",
        type: "table",
        props: {},
        content: { type: "tableContent", rows: [["invalid"]] },
        children: []
      }
    ]);

    const result = validateBlockNoteDocument(document);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ blockId: "table-1", code: "invalid_block_props" }));
  });

  it("rejects oversized tables and unsafe image or gallery URLs", () => {
    const document = createBlockNoteDocument([
      {
        id: "table-large",
        type: "table",
        props: {},
        content: {
          type: "tableContent",
          headerRows: 0,
          rows: Array.from({ length: BLOCKNOTE_MAX_TABLE_SIZE + 1 }, () => ({ cells: [[]] }))
        },
        children: []
      },
      {
        id: "image-unsafe",
        type: "image",
        props: { url: "javascript:alert(1)", sourceType: "remote" },
        content: [],
        children: []
      },
      {
        id: "gallery-unsafe",
        type: "gallery",
        props: { columns: 3, items: JSON.stringify([{ src: "data:text/html,bad" }]) },
        content: [],
        children: []
      }
    ]);

    const result = validateBlockNoteDocument(document);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ blockId: "table-large", code: "invalid_block_props" }),
      expect.objectContaining({ blockId: "image-unsafe", code: "invalid_block_props" }),
      expect.objectContaining({ blockId: "gallery-unsafe", code: "invalid_block_props" })
    ]));
  });

  it("serializes semantic article HTML with controlled style classes and variables", () => {
    const document = createBlockNoteDocument([
      {
        id: "heading-1",
        type: "heading",
        props: {
          level: 2,
          textAlignment: "center",
          articleFont: "sans",
          articleFontSize: "24",
          articleMarginTop: "16",
          articleMarginBottom: "24",
          articlePadding: "8",
          articleBackgroundColor: "#FFF7ED"
        },
        content: [
          {
            type: "text",
            text: "A safer heading",
            styles: { bold: true, articleTextColor: "#C2410C" }
          }
        ],
        children: []
      }
    ]);

    expect(serializeBlockNoteDocumentToHtml(document)).toBe(
      '<h2 class="article-align-center article-font-sans article-size-24 article-space-top-16 article-space-bottom-24 article-padding-8" style="--article-background-color:#FFF7ED"><strong style="--article-text-color:#C2410C">A safer heading</strong></h2>'
    );
  });

  it("preserves untouched custom HTML while sanitizing edited custom HTML", () => {
    const untouched = createBlockNoteDocument([
      {
        id: "legacy-1",
        type: "customHtml",
        props: {
          source: '<div style="color:red"><script>legacy()</script></div>',
          sourceDirty: false
        },
        content: [],
        children: []
      }
    ]);
    const edited = createBlockNoteDocument([
      {
        id: "edited-1",
        type: "customHtml",
        props: {
          source: '<div onclick="bad()">Safe<script>bad()</script></div>',
          sourceDirty: true
        },
        content: [],
        children: []
      }
    ]);

    expect(serializeBlockNoteDocumentToHtml(untouched)).toContain(
      '<div style="color:red"><script>legacy()</script></div>'
    );
    const editedHtml = serializeBlockNoteDocumentToHtml(edited);
    expect(editedHtml).toContain("Safe");
    expect(editedHtml).not.toContain("onclick");
    expect(editedHtml).not.toContain("<script");
  });

  it("keeps only trusted HTTPS iframe hosts in edited custom HTML", () => {
    const document = createBlockNoteDocument([
      {
        id: "embed-1",
        type: "customHtml",
        props: {
          source: '<iframe src="https://www.youtube.com/embed/abc"></iframe><iframe src="https://tracker.example/embed/abc"></iframe>',
          sourceDirty: true
        },
        content: [],
        children: []
      }
    ]);

    const html = serializeBlockNoteDocumentToHtml(document, ["www.youtube.com"]);
    expect(html).toContain("https://www.youtube.com/embed/abc");
    expect(html).not.toContain("tracker.example");
  });

  it("serializes BlockNote table rows and the configured header row", () => {
    const document = createBlockNoteDocument([
      {
        id: "table-1",
        type: "table",
        props: {},
        content: {
          type: "tableContent",
          headerRows: 1,
          rows: [
            { cells: [[{ type: "text", text: "Name", styles: {} }], [{ type: "text", text: "Value", styles: {} }]] },
            { cells: [[{ type: "text", text: "Width", styles: {} }], [{ type: "text", text: "120 cm", styles: {} }]] }
          ]
        },
        children: []
      }
    ]);

    expect(serializeBlockNoteDocumentToHtml(document)).toContain(
      "<tr><th>Name</th><th>Value</th></tr><tr><td>Width</td><td>120 cm</td></tr>"
    );
  });

  it("accepts and serializes BlockNote native image properties", () => {
    const document = createBlockNoteDocument([
      {
        id: "image-1",
        type: "image",
        props: {
          caption: "Factory exterior",
          name: "INSHOW factory",
          previewWidth: 640,
          showPreview: true,
          textAlignment: "center",
          url: "https://inshowhome.com/wp-content/uploads/factory.jpg"
        },
        content: [],
        children: []
      }
    ]);

    expect(validateBlockNoteDocument(document)).toEqual({ valid: true, errors: [] });
    expect(serializeBlockNoteDocumentToHtml(document)).toContain(
      '<img alt="INSHOW factory" src="https://inshowhome.com/wp-content/uploads/factory.jpg" width="640">'
    );
  });

  it("enforces the configured article size limits", () => {
    const blocks = Array.from({ length: 1001 }, (_, index) => ({
      id: `paragraph-${index}`,
      type: "paragraph",
      props: {},
      content: [{ type: "text", text: "Content", styles: {} }],
      children: []
    }));

    const result = validateBlockNoteDocument(createBlockNoteDocument(blocks));
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "too_many_blocks" }));
  });
});
