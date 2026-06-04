"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** "danger" paints the confirm button in the destructive (clay) colour. */
  tone?: "default" | "danger";
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Returns a promise-based `confirm(options)` that resolves to true/false,
 * rendered with the platform's own modal instead of `window.confirm`.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options ? (
        <ConfirmDialog
          options={options}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  const danger = options.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={options.description ? "confirm-desc" : undefined}
    >
      <button
        type="button"
        aria-label="Cancelar"
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div className="animate-rise relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-7">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${
              danger
                ? "bg-clay-tint text-clay"
                : "bg-terra-tint text-terra-deep"
            }`}
          >
            {danger ? "!" : "?"}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2
              id="confirm-title"
              className="font-display text-xl font-bold tracking-tight text-ink"
            >
              {options.title}
            </h2>
            {options.description ? (
              <p id="confirm-desc" className="text-sm leading-relaxed text-ink-soft">
                {options.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line-strong bg-surface px-5 text-sm font-semibold text-ink-soft transition hover:border-terra/40 hover:text-terra-deep"
          >
            {options.cancelText ?? "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "inline-flex h-10 items-center justify-center rounded-full bg-clay px-5 text-sm font-semibold text-paper shadow-[0_2px_0_0_#6f2618] transition hover:brightness-110"
                : "inline-flex h-10 items-center justify-center rounded-full bg-terra px-5 text-sm font-semibold text-paper shadow-[0_2px_0_0_var(--color-terra-deep)] transition hover:bg-terra-deep"
            }
          >
            {options.confirmText ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
