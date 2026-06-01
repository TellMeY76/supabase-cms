import type { Product, ProductCategory } from "@global-trade/core";
import { saveProductAction } from "@/app/(admin)/admin/actions";
import { emptyRichTextDocument } from "@/lib/rich-text";
import { RichTextEditor } from "./RichTextEditor";
import { FileDropzone } from "./FileDropzone";
import { CategoryTreeSelect } from "./CategoryTreeSelect";

export function ProductForm({
  product,
  categories = [],
}: {
  product?: Partial<Product> & { contentJson?: unknown };
  categories?: ProductCategory[];
}) {
  return (
    <form action={saveProductAction} className="payload-form">
      {product?.id && <input name="id" type="hidden" value={product.id} />}
      <section className="payload-form-section">
        <h2>Product content</h2>
        <div className="payload-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            required
            defaultValue={product?.title ?? ""}
          />
        </div>
        <div className="payload-field">
          <label htmlFor="slug">Slug</label>
          <input id="slug" name="slug" defaultValue={product?.slug ?? ""} />
        </div>
        <div className="payload-field">
          <label>Primary image</label>
          <FileDropzone
            name="primaryImageUrl"
            defaultValue={product?.primaryImage?.publicUrl ?? undefined}
            label="拖拽图片到此处，或点击选择"
          />
        </div>
        <div className="payload-field">
          <label>Gallery</label>
          <FileDropzone
            name="galleryUrls"
            multiple
            defaultValues={(product?.gallery ?? []).map(
              asset => asset.publicUrl
            )}
            label="拖拽图片到此处，或点击选择（可多选）"
          />
        </div>
        <div className="payload-field">
          <label>Rich content</label>
          <RichTextEditor
            name="contentJson"
            initialContent={product?.contentJson ?? emptyRichTextDocument}
            initialHtml={product?.richText ?? ""}
          />
        </div>
        <div className="payload-field">
          <label htmlFor="sku">SKU</label>
          <input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
        </div>
        <div className="payload-field">
          <label htmlFor="productType">Product type</label>
          <input
            id="productType"
            name="productType"
            defaultValue={product?.productType ?? "simple"}
          />
        </div>
        <div className="payload-field">
          <label htmlFor="summary">Summary</label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={product?.summary ?? ""}
          />
        </div>
        <div className="payload-field">
          <label>Categories</label>
          <CategoryTreeSelect categories={categories} selectedIds={product?.categoryIds ?? []} />
        </div>
        <div className="payload-field">
          <label htmlFor="tagIds">Tag IDs</label>
          <textarea
            id="tagIds"
            name="tagIds"
            rows={2}
            defaultValue={(product?.tagIds ?? []).join("\n")}
          />
        </div>

        <div className="payload-field">
          <label htmlFor="specifications">Specifications</label>
          <textarea
            id="specifications"
            name="specifications"
            rows={5}
            placeholder="Material: Steel"
            defaultValue={(product?.specifications ?? [])
              .map(spec => `${spec.name}: ${spec.value}`)
              .join("\n")}
          />
        </div>
        <div className="payload-field-grid">
          <div className="payload-field">
            <label htmlFor="regularPrice">Regular price</label>
            <input
              id="regularPrice"
              name="regularPrice"
              defaultValue={product?.regularPrice ?? ""}
            />
          </div>
          <div className="payload-field">
            <label htmlFor="salePrice">Sale price</label>
            <input
              id="salePrice"
              name="salePrice"
              defaultValue={product?.salePrice ?? ""}
            />
          </div>
          <div className="payload-field">
            <label htmlFor="currency">Currency</label>
            <input
              id="currency"
              name="currency"
              defaultValue={product?.currency ?? ""}
            />
          </div>
          <div className="payload-field">
            <label htmlFor="priceText">Price text</label>
            <input
              id="priceText"
              name="priceText"
              defaultValue={product?.priceText ?? ""}
            />
          </div>
          <div className="payload-field">
            <label htmlFor="stockStatus">Stock status</label>
            <input
              id="stockStatus"
              name="stockStatus"
              defaultValue={product?.stockStatus ?? ""}
            />
          </div>
          <div className="payload-field">
            <label htmlFor="stockQuantity">Stock quantity</label>
            <input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              defaultValue={product?.stockQuantity ?? ""}
            />
          </div>
        </div>
      </section>
      <section className="payload-form-section">
        <h2>SEO and publishing</h2>
        <div className="payload-field">
          <label htmlFor="seoTitle">SEO title</label>
          <input
            id="seoTitle"
            name="seoTitle"
            defaultValue={product?.seo?.title ?? ""}
          />
        </div>
        <div className="payload-field">
          <label htmlFor="seoDescription">SEO description</label>
          <textarea
            id="seoDescription"
            name="seoDescription"
            rows={3}
            defaultValue={product?.seo?.description ?? ""}
          />
        </div>
        <div className="payload-field">
          <label htmlFor="seoCanonicalUrl">Canonical URL</label>
          <input
            id="seoCanonicalUrl"
            name="seoCanonicalUrl"
            defaultValue={product?.seo?.canonicalUrl ?? ""}
          />
        </div>
        <div className="payload-field">
          <label htmlFor="seoOgImageUrl">OG image URL</label>
          <input
            id="seoOgImageUrl"
            name="seoOgImageUrl"
            defaultValue={product?.seo?.ogImageUrl ?? ""}
          />
        </div>
        <label className="payload-checkbox">
          <input
            name="seoNoindex"
            type="checkbox"
            defaultChecked={product?.seo?.noindex ?? false}
          />
          <span>Noindex</span>
        </label>
        <div className="payload-field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={product?.status ?? "draft"}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </section>
      <div className="payload-form-actions">
        <button className="payload-button" type="submit">
          Save product
        </button>
      </div>
    </form>
  );
}
