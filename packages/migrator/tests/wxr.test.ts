import { describe, expect, it } from "vitest";
import { parseWordPressWxr } from "../src/wordpress/wxr";

describe("WordPress WXR parser", () => {
  it("imports content custom post types as posts with their custom categories", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <item>
      <title><![CDATA[Company update]]></title>
      <link>https://example.com/news/company-update/</link>
      <pubDate>Fri, 29 May 2026 01:00:00 +0000</pubDate>
      <content:encoded><![CDATA[<p>Hello</p>]]></content:encoded>
      <wp:post_id>101</wp:post_id>
      <wp:post_name><![CDATA[company-update]]></wp:post_name>
      <wp:post_type><![CDATA[news]]></wp:post_type>
      <wp:status><![CDATA[publish]]></wp:status>
      <category domain="news_categories" nicename="company"><![CDATA[Company News]]></category>
    </item>
    <item>
      <title><![CDATA[What do you sell?]]></title>
      <link>https://example.com/faqs/what-do-you-sell/</link>
      <content:encoded><![CDATA[<p>Building products.</p>]]></content:encoded>
      <wp:post_id>102</wp:post_id>
      <wp:post_name><![CDATA[what-do-you-sell]]></wp:post_name>
      <wp:post_type><![CDATA[faqs]]></wp:post_type>
      <wp:status><![CDATA[publish]]></wp:status>
      <category domain="faqs_categories" nicename="company-and-products"><![CDATA[Company and Products]]></category>
    </item>
  </channel>
</rss>`;

    const result = parseWordPressWxr(xml, "https://example.com");
    const posts = result.entities.filter((entity) => entity.kind === "post");
    const categories = result.entities.filter((entity) => entity.kind === "postCategory");

    expect(posts).toHaveLength(2);
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ slug: "company", title: "Company News" })
        }),
        expect.objectContaining({
          data: expect.objectContaining({ slug: "company-and-products", title: "Company and Products" })
        })
      ])
    );
    expect(posts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ slug: "company-update", categoryIds: ["company"] })
        }),
        expect.objectContaining({
          data: expect.objectContaining({ slug: "what-do-you-sell", categoryIds: ["company-and-products"] })
        })
      ])
    );
  });
});
