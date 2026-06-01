import { describe, expect, it } from "vitest";
import { parseWooCommerceProductsCsv } from "../src/woocommerce/csv";

describe("WooCommerce CSV parser", () => {
  it("maps products, categories, images, and imported specs", () => {
    const csv = [
      "ID,Name,Published,Categories,Images,Description,Attribute 1 name,Attribute 1 value(s)",
      "101,Modern Cabinet,1,Kitchen > Cabinets,https://example.com/wp-content/uploads/cabinet.jpg,\"<table><tr><td>Material</td><td>Wood</td></tr></table>\",Color,White"
    ].join("\n");

    const result = parseWooCommerceProductsCsv(csv, "https://example.com");
    const product = result.entities.find((entity) => entity.kind === "product");

    const categories = result.entities.filter((entity) => entity.kind === "productCategory");
    expect(categories).toHaveLength(2);
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "productCategory",
          data: expect.objectContaining({ slug: "kitchen", title: "Kitchen" })
        }),
        expect.objectContaining({
          kind: "productCategory",
          data: expect.objectContaining({ slug: "kitchen-cabinets", title: "Cabinets", parentId: "kitchen" })
        })
      ])
    );
    expect(result.entities.some((entity) => entity.kind === "media")).toBe(true);
    expect(product?.kind).toBe("product");
    if (product?.kind === "product") {
      expect(product.data.slug).toBe("modern-cabinet");
      expect(product.data.categoryIds).toEqual(["kitchen-cabinets"]);
      expect(product.data.specifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Color", value: "White" }),
          expect.objectContaining({ name: "Material", value: "Wood" })
        ])
      );
    }
  });

  it("maps WooCommerce product category thumbnails from category CSV exports", () => {
    const csv = [
      "ID,Name,Slug,Parent,Description,Thumbnail",
      "11,PREFAB HOUSE,prefab-house,,Top category,https://example.com/wp-content/uploads/prefab.jpg",
      "12,- Container House,container-house,prefab-house,Child category,https://example.com/wp-content/uploads/container.jpg"
    ].join("\n");

    const result = parseWooCommerceProductsCsv(csv, "https://example.com");
    const categories = result.entities.filter((entity) => entity.kind === "productCategory");

    expect(categories).toHaveLength(2);
    expect(result.entities.filter((entity) => entity.kind === "media")).toHaveLength(2);
    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "container-house",
            parentId: "prefab-house",
            image: expect.objectContaining({ publicUrl: "https://example.com/wp-content/uploads/container.jpg" })
          })
        })
      ])
    );
  });
});
