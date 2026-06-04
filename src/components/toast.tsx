"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. 0 keeps it until dismissed. */
  duration?: number;
};

type ToastItem = ToastInput & { id: number; variant: ToastVariant };

type ToastApi = {
  show: (t: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = (idRef.current += 1);
      const variant = t.variant ?? "info";
      const duration = t.duration ?? (variant === "error" ? 6000 : 4000);
      setToasts((ts) => [...ts, { ...t, id, variant }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description) =>
        show({ title, description, variant: "success" }),
      error: (title, description) =>
        show({ title, description, variant: "error" }),
      info: (title, description) =>
        show({ title, description, variant: "info" }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notificaciones"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANT: Record<
  ToastVariant,
  { chip: string; icon: string; role: "status" | "alert" }
> = {
  success: { chip: "bg-moss-tint text-moss", icon: "✓", role: "status" },
  error: { chip: "bg-clay-tint text-clay", icon: "!", role: "alert" },
  info: { chip: "bg-terra-tint text-terra-deep", icon: "i", role: "status" },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const v = VARIANT[toast.variant];
  return (
    <div
      role={v.role}
      className="animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_12px_30px_-12px_rgba(4,4,21,0.35)]"
    >
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${v.chip}`}
      >
        {v.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.description ? (
          <p className="text-xs leading-relaxed text-ink-soft">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="-mr-1 -mt-1 shrink-0 rounded-full px-1.5 text-muted transition hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
