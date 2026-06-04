import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Recuperar contraseña — BeatBoard" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-ink-soft">
            Te enviaremos un enlace para crear una nueva.
          </p>
        </header>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-ink-soft">
          <Link
            href="/login"
            className="font-medium transition hover:text-terra-deep"
          >
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
