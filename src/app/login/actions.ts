"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export type AuthFormState =
  | { kind: "error"; message: string }
  | { kind: "info"; message: string }
  | undefined;

export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { kind: "error", message: "Email o contraseña inválidos." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      return {
        kind: "error",
        message:
          "Email no confirmado. Revisa tu correo o desactiva 'Confirm email' en Supabase → Authentication → Providers → Email.",
      };
    }
    if (msg.includes("invalid login")) {
      return { kind: "error", message: "Email o contraseña incorrectos." };
    }
    return { kind: "error", message: error.message };
  }

  redirect(parsed.data.next || "/admin");
}

export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return {
      kind: "error",
      message: "El email debe ser válido y la contraseña tener al menos 8 caracteres.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { kind: "error", message: error.message };
  }

  // If email confirmation is disabled, signUp returns a session — redirect straight in.
  if (data.session) {
    redirect(parsed.data.next || "/admin");
  }

  return {
    kind: "info",
    message:
      "Cuenta creada. Revisa tu correo para confirmarla, o desactiva 'Confirm email' en Supabase → Authentication → Providers → Email y vuelve a iniciar sesión.",
  };
}

export async function signInWithGoogle(formData: FormData) {
  const next = (formData.get("next") as string) || "/admin";
  const supabase = await createSupabaseServerClient();

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const fullOrigin = origin.startsWith("http") ? origin : `https://${origin}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${fullOrigin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return;
  }
  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
