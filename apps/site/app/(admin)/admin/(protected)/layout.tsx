import Link from "next/link";
import {
  Home,
  LogOut,
} from "lucide-react";
import { requireAdminSession } from "@/lib/auth";
import { logoutAction } from "@/app/(admin)/admin/auth-actions";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return (
    <main className="payload-admin">
      <aside className="payload-sidebar">
        <Link className="payload-brand" href="/admin">
          <span className="payload-brand-mark">GT</span>
          <span>Admin</span>
        </Link>
        <AdminNav role={session.profile.role} />
      </aside>
      <section className="payload-workspace">
        <header className="payload-topbar">
          <div>
            <p className="payload-eyebrow">Dashboard</p>
            <strong>{session.profile.fullName || session.user.email || "Admin user"}</strong>
          </div>
          <div className="payload-topbar-actions">
            <Link className="payload-button payload-button--ghost" href="/" target="_blank">
              <Home size={16} />
              <span>View site</span>
            </Link>
            <form action={logoutAction}>
              <button className="payload-icon-button" title="Logout" type="submit">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>
        <div className="payload-content">{children}</div>
      </section>
    </main>
  );
}
