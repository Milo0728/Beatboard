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
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-orange-500 text-lg font-black text-zinc-950"
          >
            B
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
            <p className="text-sm text-zinc-400">
              {profile?.displayName ?? current?.authUser.email} ·{" "}
              <span className="font-medium uppercase tracking-wider text-zinc-500">
                {role}
              </span>
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      {role === "viewer" ? (
        <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5 text-sm text-amber-200">
          <p className="font-semibold">Cuenta sin permisos de host.</p>
          <p className="mt-1 text-amber-200/80">
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
    "group flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition";
  if (disabled) {
    return (
      <div className={`${className} opacity-40`}>
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        <p className="text-sm text-zinc-400">{body}</p>
        <span className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
          Requiere permisos
        </span>
      </div>
    );
  }
  return (
    <Link href={href} className={`${className} hover:border-zinc-700 hover:bg-zinc-900`}>
      <h3 className="font-semibold text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-400">{body}</p>
      <span className="mt-2 text-xs font-medium text-fuchsia-400 group-hover:text-fuchsia-300">
        Abrir →
      </span>
    </Link>
  );
}
