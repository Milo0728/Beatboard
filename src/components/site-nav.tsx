import { headers } from "next/headers";
import Link from "next/link";

import { signOut } from "@/app/login/actions";
import { MobileNav, type MobileNavLink } from "@/components/mobile-nav";
import { getCurrentUser } from "@/lib/auth";

const NO_NAV_PREFIXES = ["/live/overlay"];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  host: "Host",
  guest: "Invitado",
  viewer: "Espectador",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-terra-tint text-terra-deep ring-terra/25",
  host: "bg-moss-tint text-moss ring-moss/30",
  guest: "bg-gold-tint text-gold ring-gold/30",
  viewer: "bg-surface-soft text-ink-soft ring-line-strong",
};

export async function SiteNav() {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  if (NO_NAV_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const current = await getCurrentUser();
  const profile = current?.profile;
  const email = current?.authUser.email;
  const role = profile?.role ?? "viewer";

  const navLinks: MobileNavLink[] = [
    { href: "/rankings", label: "Rankings" },
    { href: "/albums", label: "Álbumes" },
    { href: "/live", label: "En vivo" },
    ...(current ? [{ href: "/admin", label: "Panel" }] : []),
  ];

  const mobileAuth = current
    ? {
        loggedIn: true as const,
        email: email ?? null,
        roleLabel: ROLE_LABEL[role],
        roleTone: ROLE_TONE[role],
      }
    : { loggedIn: false as const };

  return (
    <nav className="sticky top-0 z-40 border-b border-line/80 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-terra font-display text-lg font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition group-hover:-translate-y-0.5">
            B
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            BeatBoard
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft sm:flex">
          <Link href="/rankings" className="transition hover:text-terra-deep">
            Rankings
          </Link>
          <Link href="/albums" className="transition hover:text-terra-deep">
            Álbumes
          </Link>
          <Link href="/live" className="transition hover:text-terra-deep">
            En vivo
          </Link>
          {current ? (
            <Link href="/admin" className="transition hover:text-terra-deep">
              Panel
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            {current ? (
              <>
                <Link
                  href="/settings"
                  title="Ajustes de perfil"
                  className="group flex items-center gap-2 text-xs"
                >
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider ring-1 ring-inset ${ROLE_TONE[role]}`}
                  >
                    {ROLE_LABEL[role]}
                  </span>
                  <span className="max-w-[14ch] truncate text-muted transition group-hover:text-terra-deep">
                    {email}
                  </span>
                </Link>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-4 text-xs font-semibold text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
                  >
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-full bg-terra px-4 text-xs font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
              >
                Iniciar sesión
              </Link>
            )}
          </div>

          <MobileNav links={navLinks} auth={mobileAuth} />
        </div>
      </div>
    </nav>
  );
}
