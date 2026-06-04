"use client";

import { useActionState, useEffect } from "react";

import { useToast } from "@/components/toast";
import { updateProfile, type ProfileFormState } from "./actions";

type Props = {
  initial: {
    displayName: string;
    username: string;
    avatarUrl: string;
    email: string;
    role: string;
  };
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  host: "Host",
  guest: "Invitado",
  viewer: "Espectador",
};

export function ProfileForm({ initial }: Props) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    undefined,
  );
  const toast = useToast();

  useEffect(() => {
    if (!state) return;
    if (state.kind === "success") toast.success(state.message);
    else toast.error(state.message);
  }, [state, toast]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8"
    >
      <Field
        id="displayName"
        label="Nombre visible"
        name="displayName"
        defaultValue={initial.displayName}
        placeholder="Tu nombre"
        maxLength={100}
        required
        disabled={pending}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-xs font-medium uppercase tracking-wider text-muted"
        >
          Usuario
        </label>
        <div className="flex items-center rounded-xl border border-line-strong bg-surface-soft focus-within:border-terra">
          <span className="pl-3 text-sm text-muted">@</span>
          <input
            id="username"
            name="username"
            defaultValue={initial.username}
            placeholder="usuario"
            maxLength={30}
            required
            disabled={pending}
            className="h-11 w-full rounded-xl bg-transparent px-2 text-ink outline-none placeholder:text-muted disabled:opacity-60"
          />
        </div>
        <p className="text-xs text-muted">
          Solo minúsculas, números y guion bajo.
        </p>
      </div>

      <Field
        id="avatarUrl"
        label="URL del avatar (opcional)"
        name="avatarUrl"
        type="url"
        defaultValue={initial.avatarUrl}
        placeholder="https://…"
        disabled={pending}
      />

      {/* Read-only account info */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl border border-line bg-surface-soft px-4 py-3 text-sm">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted">Email</span>
          <span className="text-ink-soft">{initial.email}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-muted">Rol</span>
          <span className="text-ink-soft">
            {ROLE_LABEL[initial.role] ?? initial.role}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center rounded-full bg-terra px-6 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  maxLength,
  required,
  disabled,
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wider text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        className="h-11 w-full rounded-xl border border-line-strong bg-surface-soft px-3 text-ink outline-none placeholder:text-muted focus:border-terra disabled:opacity-60"
      />
    </div>
  );
}
