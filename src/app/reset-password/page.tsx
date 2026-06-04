import type { Metadata } from "next";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña — BeatBoard" };

export default async function ResetPasswordPage() {
  const current = await getCurrentUser();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Nueva contraseña
          </h1>
          <p className="text-sm text-ink-soft">
            Elige una contraseña nueva para tu cuenta.
          </p>
        </header>

        {current ? (
          <ResetPasswordForm />
        ) : (
          <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 text-center text-sm text-ink-soft shadow-sm">
            <p>
              El enlace de recuperación no es válido o ya expiró. Solicita uno
              nuevo.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex h-11 items-center justify-center rounded-full bg-terra px-6 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
            >
              Solicitar enlace
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
