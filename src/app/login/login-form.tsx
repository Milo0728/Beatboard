"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useToast } from "@/components/toast";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type AuthFormState,
} from "./actions";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [signInState, signInAction, signInPending] = useActionState<AuthFormState, FormData>(
    signInWithPassword,
    undefined,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState<AuthFormState, FormData>(
    signUpWithPassword,
    undefined,
  );

  const toast = useToast();

  useEffect(() => {
    if (!signInState) return;
    if (signInState.kind === "error") toast.error(signInState.message);
    else toast.show({ variant: "info", title: signInState.message, duration: 0 });
  }, [signInState, toast]);

  useEffect(() => {
    if (!signUpState) return;
    if (signUpState.kind === "error") toast.error(signUpState.message);
    else toast.show({ variant: "info", title: signUpState.message, duration: 0 });
  }, [signUpState, toast]);

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <form
        action={signInWithGoogle}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-3 rounded-full border border-line-strong bg-surface text-sm font-medium text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
        <div className="h-px flex-1 bg-line" />
        o con email
        <div className="h-px flex-1 bg-line" />
      </div>

      <form action={signInAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
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
        <label className="flex flex-col gap-1.5 text-sm text-ink-soft">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="h-11 rounded-xl border border-line-strong bg-surface-soft px-3 text-ink outline-none transition focus:border-terra"
          />
        </label>

        <div className="-mt-1 text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-ink-soft transition hover:text-terra-deep"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={signInPending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-terra text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep disabled:opacity-60"
          >
            {signInPending ? "Entrando..." : "Iniciar sesión"}
          </button>
          <button
            type="submit"
            formAction={signUpAction}
            disabled={signUpPending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-line-strong bg-surface text-sm font-semibold text-ink-soft transition hover:border-terra/40 hover:text-terra-deep disabled:opacity-60"
          >
            {signUpPending ? "Creando..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
