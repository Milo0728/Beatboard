"use client";

import { useActionState, useEffect } from "react";

import { useToast } from "@/components/toast";
import { updatePassword, type AuthFormState } from "@/app/login/actions";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    undefined,
  );
  const toast = useToast();

  useEffect(() => {
    if (state?.kind === "error") toast.error(state.message);
  }, [state, toast]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
        Nueva contraseña
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 rounded-xl border border-line-strong bg-surface-soft px-3 text-ink outline-none transition focus:border-terra"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-terra text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
