import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  host: "Host",
  guest: "Invitado",
  viewer: "Espectador",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
  host: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  guest: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  viewer: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

export async function SiteNav() {
  const current = await getCurrentUser();
  const profile = current?.profile;
  const email = current?.authUser.email;
  const role = profile?.role ?? "viewer";

  return (
    <nav className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-orange-500 text-sm font-black text-zinc-950">
            B
          </div>
          <span className="text-sm font-semibold tracking-tight">BeatBoard</span>
        </Link>

        <div className="hidden gap-5 text-sm text-zinc-400 sm:flex">
          <Link href="/rankings" className="hover:text-zinc-100">
            Rankings
          </Link>
          <Link href="/albums" className="hover:text-zinc-100">
            Álbumes
          </Link>
          {current ? (
            <Link href="/admin" className="hover:text-zinc-100">
              Panel
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {current ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium uppercase tracking-wider ring-1 ${ROLE_TONE[role]}`}
                >
                  {ROLE_LABEL[role]}
                </span>
                <span className="hidden text-zinc-400 sm:inline">{email}</span>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-md border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="hidden text-xs text-zinc-500 sm:inline">
                Sin sesión
              </span>
              <Link
                href="/login"
                className="inline-flex h-8 items-center rounded-md bg-zinc-100 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-white"
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
