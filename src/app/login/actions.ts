"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { rateLimit } from "@/lib/rate-limit";
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

function siteOrigin(): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  return origin.startsWith("http") ? origin : `https://${origin}`;
}

const resetEmailSchema = z.object({ email: z.string().email() });

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { kind: "error", message: "Introduce un email válido." };
  }

  const h = await headers();
  const ip = (
    h.get("x-forwarded-for")?.split(",")[0] ??
    h.get("x-real-ip") ??
    "unknown"
  ).trim();
  if (!rateLimit(`pwreset:${ip}`, 3, 10 * 60_000).ok) {
    return {
      kind: "error",
      message: "Demasiados intentos. Inténtalo de nuevo más tarde.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password` },
  );

  if (error) {
    return { kind: "error", message: error.message };
  }

  // Don't reveal whether the email exists.
  return {
    kind: "info",
    message:
      "Si ese email tiene una cuenta, te enviamos un enlace para restablecer la contraseña. Revisa tu correo (y la carpeta de spam).",
  };
}

const newPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      kind: "error",
      message: parsed.error.issues[0]?.message ?? "Contraseña inválida.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      kind: "error",
      message: "El enlace de recuperación expiró. Solicita uno nuevo.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { kind: "error", message: error.message };
  }

  redirect("/admin");
}
