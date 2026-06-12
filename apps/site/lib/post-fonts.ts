export const POST_EDITOR_FONTS = [
  { label: "Site sans", value: "sans", cssFamily: "var(--font-sans, Arial, sans-serif)" },
  { label: "Serif", value: "serif", cssFamily: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "mono", cssFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }
] as const;

export const POST_EDITOR_FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "40", "48"] as const;
