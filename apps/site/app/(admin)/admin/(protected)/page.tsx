import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/auth";

export default async function AdminHomePage() {
  const session = await requireAdminSession();
  const canViewUsers = ["owner", "admin"].includes(session.profile.role);
  const stats = await getAdminDashboardStats(canViewUsers);

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Manage site content, product catalog, inquiries, and migration batches.</p>
        </div>
      </div>
      <section className="payload-banner">
        <h2>Welcome to your dashboard!</h2>
        <p>Use the collections below to create content manually or import from WordPress/WooCommerce.</p>
      </section>
      <div className="payload-grid">
        <Link className="payload-card" href="/admin/posts">
          <h2>Posts</h2>
          <p>{stats.posts} entries</p>
        </Link>
        <Link className="payload-card" href="/admin/products">
          <h2>Products</h2>
          <p>{stats.products} entries</p>
        </Link>
        <Link className="payload-card" href="/admin/product-categories">
          <h2>Categories</h2>
          <p>{stats.productCategories} entries</p>
        </Link>
        <Link className="payload-card" href="/admin/migrations">
          <h2>Migrations</h2>
          <p>Preview and import WXR/CSV files.</p>
        </Link>
        {canViewUsers && (
          <Link className="payload-card" href="/admin/users">
            <h2>Users</h2>
            <p>{stats.users} accounts</p>
          </Link>
        )}
      </div>
    </div>
  );
}
