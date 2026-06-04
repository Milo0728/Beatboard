"use client";

import { useActionState, useEffect } from "react";

import { useToast } from "@/components/toast";
import { requestPasswordReset, type AuthFormState } from "@/app/login/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    undefined,
  );
  const toast = useToast();

  useEffect(() => {
    if (!state) return;
    if (state.kind === "error") toast.error(state.message);
    else toast.show({ variant: "info", title: state.message, duration: 0 });
  }, [state, toast]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="h-11 rounded-xl border border-line-strong bg-surface-soft px-3 text-ink outline-none transition focus:border-terra"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-terra text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
