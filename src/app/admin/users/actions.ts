"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/db/client";
import { requireRole } from "@/lib/auth";

const roleSchema = z.enum(["admin", "host", "guest", "viewer"]);
const userIdSchema = z.string().uuid();

export type UpdateRoleResult = { ok: true } | { ok: false; error: string };

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "host" | "guest" | "viewer",
): Promise<UpdateRoleResult> {
  const current = await requireRole(["admin"], "/admin/users");

  const parsedRole = roleSchema.safeParse(newRole);
  if (!parsedRole.success) {
    return { ok: false, error: "Rol inválido." };
  }

  const parsedId = userIdSchema.safeParse(userId);
  if (!parsedId.success) {
    return { ok: false, error: "Usuario inválido." };
  }

  if (current.profile?.id === parsedId.data) {
    return { ok: false, error: "No puedes cambiar tu propio rol." };
  }

  if (!db) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  await db
    .update(schema.users)
    .set({ role: parsedRole.data })
    .where(eq(schema.users.id, parsedId.data));

  revalidatePath("/admin/users");

  return { ok: true };
}
