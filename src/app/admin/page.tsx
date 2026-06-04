import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Panel — BeatBoard" };

export default async function AdminPage() {
  // Middleware already redirected unauthenticated users; we just need the profile.
  const current = await getCurrentUser();
  const profile = current?.profile;
  const role = profile?.role ?? "viewer";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra text-lg font-extrabold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)]"
          >
            B
          </Link>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Panel de control</h1>
            <p className="text-sm text-ink-soft">
              {profile?.displayName ?? current?.authUser.email} ·{" "}
              <span className="font-medium uppercase tracking-wider text-muted">
                {role}
              </span>
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      {role === "viewer" ? (
        <div className="rounded-2xl border border-gold/30 bg-gold-tint p-5 text-sm text-gold">
          <p className="font-semibold">Cuenta sin permisos de host.</p>
          <p className="mt-1 text-gold/80">
            Tu rol actual es <code className="font-mono">viewer</code>. Pídele a un
            administrador que te eleve a <code className="font-mono">host</code> o{" "}
            <code className="font-mono">admin</code> para gestionar álbumes y calificar.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <PanelCard
          title="Álbumes"
          body="Crear, editar o archivar álbumes y sus tracklists."
          href="/admin/albums"
          disabled={role !== "admin" && role !== "host"}
        />
        <PanelCard
          title="Pantalla en vivo"
          body="Calificar un álbum durante el stream."
          href="/live"
          disabled={role !== "admin" && role !== "host" && role !== "guest"}
        />
        <PanelCard
          title="Usuarios"
          body="Gestionar roles y invitar hosts."
          href="/admin/users"
          disabled={role !== "admin"}
        />
        <PanelCard
          title="Mis calificaciones"
          body="Histórico de todo lo que has puntuado."
          href="/my-ratings"
          disabled={false}
        />
      </section>
    </div>
  );
}

function PanelCard({
  title,
  body,
  href,
  disabled,
}: {
  title: string;
  body: string;
  href: string;
  disabled: boolean;
}) {
  const className =
    "group flex flex-col gap-2 rounded-3xl border border-line bg-surface p-5 shadow-sm transition";
  if (disabled) {
    return (
      <div className={`${className} opacity-40`}>
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-sm text-ink-soft">{body}</p>
        <span className="mt-2 text-xs uppercase tracking-wider text-muted">
          Requiere permisos
        </span>
      </div>
    );
  }
  return (
    <Link href={href} className={`${className} hover:border-terra/40 hover:shadow-md`}>
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-soft">{body}</p>
      <span className="mt-2 text-xs font-medium text-terra group-hover:text-terra-deep">
        Abrir →
      </span>
    </Link>
  );
}
