import { desc } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";

import { RoleSelect } from "./role-select";
import { db, schema } from "@/db/client";
import { requireRole, type Role } from "@/lib/auth";

export const metadata = { title: "Usuarios — Admin BeatBoard" };

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  host: "Host",
  guest: "Invitado",
  viewer: "Espectador",
};

const ROLE_PLURAL: Record<Role, string> = {
  admin: "admins",
  host: "hosts",
  guest: "invitados",
  viewer: "espectadores",
};

const SPANISH_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatRelative(date: Date | null | undefined, now: Date): string {
  if (!date) return "nunca";
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) return "hace un momento";
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return `hace ${Math.abs(diffMin)} min`;
  }
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) {
    return `hace ${Math.abs(diffHr)} h`;
  }
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 7) {
    return `hace ${Math.abs(diffDay)} día${Math.abs(diffDay) === 1 ? "" : "s"}`;
  }
  // Older: "el 12 mar" or "el 12 mar 2024" if year differs.
  const day = date.getDate();
  const month = SPANISH_MONTHS[date.getMonth()];
  const sameYear = date.getFullYear() === now.getFullYear();
  return sameYear ? `el ${day} ${month}` : `el ${day} ${month} ${date.getFullYear()}`;
}

function initialsFor(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function AdminUsersPage() {
  const current = await requireRole(["admin"], "/admin/users");

  const users = db
    ? await db
        .select()
        .from(schema.users)
        .orderBy(desc(schema.users.createdAt))
    : [];

  const counts: Record<Role, number> = {
    admin: 0,
    host: 0,
    guest: 0,
    viewer: 0,
  };
  for (const u of users) {
    counts[u.role as Role] = (counts[u.role as Role] ?? 0) + 1;
  }

  const summaryParts: string[] = [];
  for (const role of ["admin", "host", "guest", "viewer"] as const) {
    const n = counts[role];
    if (n > 0) {
      const singular = ROLE_LABEL[role].toLowerCase();
      const label = n === 1 ? singular : ROLE_PLURAL[role];
      summaryParts.push(`${n} ${label}`);
    }
  }
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : "Sin usuarios";

  const now = new Date();
  const currentUserId = current.profile?.id;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            <Link href="/admin" className="hover:text-terra-deep">
              ← Panel
            </Link>
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">Usuarios</h1>
          <p className="mt-1 text-sm text-ink-soft">Gestión de roles y permisos.</p>
        </div>
        <div className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-ink-soft">
          {summary}
        </div>
      </header>

      {users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-2xl">
            👥
          </div>
          <p className="text-sm text-ink-soft">No hay usuarios registrados todavía.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="w-14 px-4 py-3" />
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Creado</th>
                <th className="px-4 py-3 text-left">Última sesión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const isSelf = currentUserId === u.id;
                const rowClass = isSelf
                  ? "bg-terra-tint/50 ring-1 ring-inset ring-terra/20"
                  : "hover:bg-surface-soft";
                return (
                  <tr key={u.id} className={rowClass}>
                    <td className="px-4 py-3">
                      {u.avatarUrl ? (
                        <Image
                          src={u.avatarUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-terra-tint text-xs font-semibold text-terra-deep ring-1 ring-terra/25">
                          {initialsFor(u.displayName || u.username || u.email)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">
                            {u.displayName}
                          </span>
                          {isSelf ? (
                            <span className="rounded-full bg-terra-tint px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-terra-deep ring-1 ring-terra/25">
                              tú
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted">@{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleSelect
                        userId={u.id}
                        currentRole={u.role as Role}
                        isSelf={isSelf}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatRelative(u.createdAt, now)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatRelative(u.lastSeenAt, now)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
