import { ProductCategoryDialog } from "@/components/admin/ProductCategoryDialog";
import { ProductCategoryTreeTable } from "@/components/admin/ProductCategoryTreeTable";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { listAdminProductCategories } from "@/lib/admin-data";

export default async function AdminProductCategoriesPage() {
  const categories = await listAdminProductCategories();

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Categories</h1>
          <p>Create and edit product category structure.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
          <ProductCategoryDialog
            buttonClassName="payload-button"
            buttonLabel="New Category"
            categories={categories}
            title="New category"
          />
        </div>
      </div>
      <ProductCategoryTreeTable categories={categories} />
    </div>
  );
}
