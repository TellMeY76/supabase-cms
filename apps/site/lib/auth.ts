import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserRole } from "@global-trade/core";

export interface AdminSession {
  user: {
    id: string;
    email?: string | undefined;
  };
  profile: {
    role: UserRole;
    fullName?: string | null;
  };
}

export async function createCookieSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requirePublicSupabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options) {
              cookieStore.set(name, value, options);
            } else {
              cookieStore.set(name, value);
            }
          });
        } catch {
          // Server Components cannot set cookies; auth actions can.
        }
      }
    }
  });
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !getPublicSupabaseKey()) {
    return {
      user: { id: "local-admin", email: "local@example.com" },
      profile: { role: "owner", fullName: "Local Admin" }
    };
  }

  const supabase = await createCookieSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  return {
    user: {
      id: user.id,
      email: user.email ?? undefined
    },
    profile: {
      role: (profile?.role ?? "viewer") as UserRole,
      fullName: profile?.full_name ?? null
    }
  };
});

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminRole(allowedRoles: UserRole[]) {
  const session = await requireAdminSession();
  if (!allowedRoles.includes(session.profile.role)) redirect("/admin");
  return session;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function requirePublicSupabaseKey() {
  const value = getPublicSupabaseKey();
  if (!value) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return value;
}

function getPublicSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
