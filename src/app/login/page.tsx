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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-orange-500 text-lg font-black text-zinc-950">
            B
          </div>
          <span className="text-xl font-semibold tracking-tight">BeatBoard</span>
        </Link>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Bienvenido de vuelta</h1>
          <p className="text-sm text-zinc-400">
            Inicia sesión para gestionar álbumes y emitir calificaciones.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="h-64 w-full animate-pulse rounded-lg bg-zinc-900/40" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
