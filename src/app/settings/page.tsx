import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Ajustes — BeatBoard" };

export default async function SettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login?next=/settings");

  const profile = current.profile;
  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-12 sm:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Ajustes
        </h1>
        <p className="rounded-3xl border border-line bg-surface p-6 text-sm text-ink-soft shadow-sm">
          Tu perfil aún no está disponible. Cierra sesión y vuelve a entrar; si
          el problema persiste, contacta a un administrador.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-5 py-12 sm:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terra">
          Tu cuenta
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
          Ajustes de perfil
        </h1>
        <p className="text-sm text-ink-soft">
          Edita cómo apareces en BeatBoard. ¿Buscas tus calificaciones?{" "}
          <Link
            href="/my-ratings"
            className="font-semibold text-terra-deep hover:text-terra"
          >
            Ver mis votos →
          </Link>
        </p>
      </header>

      <ProfileForm
        initial={{
          displayName: profile.displayName,
          username: profile.username,
          avatarUrl: profile.avatarUrl ?? "",
          email: current.authUser.email ?? "",
          role: profile.role,
        }}
      />
    </main>
  );
}
