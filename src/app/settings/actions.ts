"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";

export type ProfileFormState =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string }
  | undefined;

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "El nombre visible no puede estar vacío.")
    .max(100, "El nombre visible no puede superar los 100 caracteres."),
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(30, "El usuario no puede superar los 30 caracteres.")
    .regex(
      /^[a-z0-9_]+$/,
      "Solo minúsculas, números y guion bajo (sin espacios).",
    ),
  avatarUrl: z
    .union([z.string().url("La URL del avatar no es válida."), z.literal("")])
    .optional(),
});

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const current = await getCurrentUser();
  if (!current?.profile) {
    return { kind: "error", message: "Debes iniciar sesión." };
  }
  if (!db) {
    return { kind: "error", message: "Base de datos no configurada." };
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    username: String(formData.get("username") ?? "")
      .trim()
      .toLowerCase(),
    avatarUrl: formData.get("avatarUrl") ?? "",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    return { kind: "error", message: first };
  }

  const { displayName, username } = parsed.data;
  const avatarUrl =
    parsed.data.avatarUrl && parsed.data.avatarUrl.length > 0
      ? parsed.data.avatarUrl
      : null;

  // Username must stay unique across users (ignore the current user's own row).
  const [clash] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.username, username),
        ne(schema.users.id, current.profile.id),
      ),
    )
    .limit(1);

  if (clash) {
    return { kind: "error", message: "Ese nombre de usuario ya está en uso." };
  }

  await db
    .update(schema.users)
    .set({ displayName, username, avatarUrl })
    .where(eq(schema.users.id, current.profile.id));

  revalidatePath("/settings");
  return { kind: "success", message: "Perfil actualizado." };
}
