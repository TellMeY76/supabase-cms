import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const siteRoot = fileURLToPath(new URL("..", import.meta.url));

describe("frontend Tailwind style regressions", () => {
  it("keeps the footer wrapper independent from Tailwind's container utility", () => {
    const footer = readFileSync(`${siteRoot}/components/Footer.tsx`, "utf8");
    const styles = readFileSync(`${siteRoot}/app/globals.css`, "utf8");

    expect(footer).toContain('className="footer-container"');
    expect(footer).not.toContain('className="container"');
    expect(styles).toContain(".site-footer .footer-container");
    expect(styles).not.toContain(".site-footer .container");
  });
});
