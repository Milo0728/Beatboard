import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db, schema } from "@/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "admin" | "host" | "guest" | "viewer";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (!db) return { authUser: user, profile: null };

  const [profile] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  return { authUser: user, profile: profile ?? null };
}

/**
 * Require an authenticated session with at least one of the allowed roles.
 * Redirects to /login or / depending on what's missing.
 */
export async function requireRole(allowed: Role[], redirectPath = "/admin") {
  const current = await getCurrentUser();
  if (!current) {
    redirect(`/login?next=${encodeURIComponent(redirectPath)}`);
  }
  if (!current.profile || !allowed.includes(current.profile.role)) {
    redirect("/");
  }
  return current;
}
