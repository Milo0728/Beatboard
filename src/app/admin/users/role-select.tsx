"use client";

import { useState, useTransition } from "react";

import { useToast } from "@/components/toast";
import { updateUserRole } from "./actions";
import type { Role } from "@/lib/auth";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "host", label: "Host" },
  { value: "guest", label: "Invitado" },
  { value: "viewer", label: "Espectador" },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  host: "Host",
  guest: "Invitado",
  viewer: "Espectador",
};

const ROLE_TONE: Record<Role, string> = {
  admin: "bg-terra-tint text-terra-deep ring-terra/25",
  host: "bg-moss-tint text-moss ring-moss/30",
  guest: "bg-gold-tint text-gold ring-gold/30",
  viewer: "bg-surface-soft text-ink-soft ring-line-strong",
};

type Props = {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
};

export function RoleSelect({ userId, currentRole, isSelf }: Props) {
  const [value, setValue] = useState<Role>(currentRole);
  const [prevRole, setPrevRole] = useState<Role>(currentRole);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  // Re-sync the select if the role changes server-side (state reset during
  // render — the React-recommended pattern instead of an effect).
  if (currentRole !== prevRole) {
    setPrevRole(currentRole);
    setValue(currentRole);
  }

  if (isSelf) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider ring-1 ${ROLE_TONE[currentRole]}`}
      >
        {ROLE_LABEL[currentRole]}
      </span>
    );
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Role;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateUserRole(userId, next);
      if (!result.ok) {
        setValue(previous);
        toast.error("No se pudo cambiar el rol", result.error);
        return;
      }
      toast.success(`Rol actualizado a ${ROLE_LABEL[next]}`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={onChange}
          disabled={pending}
          className="h-9 rounded-xl border border-line-strong bg-surface-soft px-2 text-ink outline-none focus:border-terra disabled:opacity-60"
          aria-label="Cambiar rol"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {pending ? <span className="text-xs text-muted">…</span> : null}
      </div>
    </div>
  );
}
