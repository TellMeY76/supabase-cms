"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  UploadCloud,
  Users
} from "lucide-react";
import type { UserRole } from "@global-trade/core";

type AdminNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles?: UserRole[];
};

const navItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/post-categories", label: "Post Categories", icon: FolderTree },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/product-categories", label: "Product Categories", icon: FolderTree },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/migrations", label: "Migrations", icon: UploadCloud },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["owner", "admin"] },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="payload-nav" aria-label="Admin navigation">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = isActiveNavItem(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "payload-nav-item is-active" : "payload-nav-item"}
            data-active={active ? "true" : undefined}
            href={item.href}
            key={item.href}
            onFocus={() => router.prefetch(item.href)}
            onMouseEnter={() => router.prefetch(item.href)}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function isActiveNavItem(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
