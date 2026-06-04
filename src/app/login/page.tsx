import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión — BeatBoard" };

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra text-lg font-extrabold text-paper">
            B
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">BeatBoard</span>
        </Link>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Bienvenido de vuelta</h1>
          <p className="text-sm text-ink-soft">
            Inicia sesión para gestionar álbumes y emitir calificaciones.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-64 w-full animate-pulse rounded-lg bg-surface" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
