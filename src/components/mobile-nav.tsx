"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/login/actions";

export type MobileNavLink = { href: string; label: string };

type Props = {
  links: MobileNavLink[];
  auth:
    | { loggedIn: true; email: string | null; roleLabel: string; roleTone: string }
    | { loggedIn: false };
};

export function MobileNav({ links, auth }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close on route change (state reset during render, the React-recommended
  // pattern — no effect needed).
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
      >
        <span className="relative block h-3.5 w-4" aria-hidden>
          <span
            className={`absolute left-0 block h-0.5 w-full rounded-full bg-current transition-all duration-300 ${
              open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1/2 block h-0.5 w-full -translate-y-1/2 rounded-full bg-current transition-all duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-0.5 w-full rounded-full bg-current transition-all duration-300 ${
              open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
            }`}
          />
        </span>
      </button>

      {open ? (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-ink/30 backdrop-blur-[2px]"
          />
          {/* Panel */}
          <div
            id="mobile-nav-panel"
            className="animate-rise fixed inset-x-0 top-16 z-50 border-b border-line bg-paper/95 shadow-lg backdrop-blur-md"
          >
            <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-xl px-3 py-3 text-base font-semibold text-ink transition hover:bg-surface-soft hover:text-terra-deep"
                >
                  {l.label}
                </Link>
              ))}

              <div className="mt-3 border-t border-line pt-4">
                {auth.loggedIn ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col">
                      <Link
                        href="/settings"
                        className="rounded-xl px-3 py-3 text-base font-semibold text-ink transition hover:bg-surface-soft hover:text-terra-deep"
                      >
                        Mi perfil
                      </Link>
                      <Link
                        href="/my-ratings"
                        className="rounded-xl px-3 py-3 text-base font-semibold text-ink transition hover:bg-surface-soft hover:text-terra-deep"
                      >
                        Mis votos
                      </Link>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3">
                      <div className="flex min-w-0 items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider ring-1 ring-inset ${auth.roleTone}`}
                        >
                          {auth.roleLabel}
                        </span>
                        {auth.email ? (
                          <span className="truncate text-muted">{auth.email}</span>
                        ) : null}
                      </div>
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="inline-flex h-9 shrink-0 items-center rounded-full border border-line-strong bg-surface px-4 text-xs font-semibold text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
                        >
                          Salir
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-terra px-4 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
