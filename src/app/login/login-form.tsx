"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

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

  const feedback = signInState ?? signUpState;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <form
        action={signInWithGoogle}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-500">
        <div className="h-px flex-1 bg-zinc-800" />
        o con email
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <form action={signInAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none transition focus:border-fuchsia-500"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-zinc-100 outline-none transition focus:border-fuchsia-500"
          />
        </label>

        {feedback ? (
          <p
            className={
              feedback.kind === "error"
                ? "rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300"
                : "rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200"
            }
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={signInPending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-60"
          >
            {signInPending ? "Entrando..." : "Iniciar sesión"}
          </button>
          <button
            type="submit"
            formAction={signUpAction}
            disabled={signUpPending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-60"
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
