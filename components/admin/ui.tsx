"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Armchair,
  CheckCircle,
  CircleNotch,
  Clock,
  Prohibit,
  UserMinus,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import type { ActionResult } from "@/app/admin/actions";
import type { BookingStatus } from "@/lib/types";

/* ---------- Toasts ---------- */

interface Toast {
  id: number;
  tone: "ok" | "error";
  text: string;
}

const ToastContext = createContext<(tone: Toast["tone"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = ++next.current;
    setToasts((all) => [...all.slice(-3), { id, tone, text }]);
    window.setTimeout(() => setToasts((all) => all.filter((t) => t.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-[0_20px_40px_-16px_rgba(23,20,21,0.5)] ${
                toast.tone === "ok" ? "bg-asphalt text-chrome" : "bg-amber text-chrome"
              }`}
            >
              {toast.tone === "ok" ? (
                <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-emerald-300" />
              ) : (
                <WarningCircle size={18} weight="fill" className="mt-px shrink-0" />
              )}
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* Runs a server action in a transition and reports the result as a toast. */
export function useAction() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = useCallback(
    (action: () => Promise<ActionResult>, onOk?: () => void) =>
      start(async () => {
        try {
          const result = await action();
          if (result.ok) {
            toast("ok", result.message ?? "Gespeichert.");
            onOk?.();
          } else toast("error", result.error);
        } catch {
          toast("error", "Der Server ist gerade nicht erreichbar. Bitte Verbindung prüfen und noch einmal versuchen.");
        }
      }),
    [toast],
  );
  return { pending, run };
}

/* ---------- Building blocks ---------- */

const BUTTONS = {
  primary: "bg-amber text-chrome hover:bg-[#9a1a31]",
  dark: "bg-asphalt text-chrome hover:bg-black",
  secondary: "bg-white text-bone ring-1 ring-inset ring-bone/15 hover:bg-night",
  ghost: "text-bone hover:bg-bone/5",
  danger: "bg-white text-amber ring-1 ring-inset ring-amber/30 hover:bg-amber hover:text-chrome",
} as const;

export function Button({
  variant = "secondary",
  size = "md",
  busy,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTONS; size?: "sm" | "md"; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-9 px-3.5 text-sm" : "h-11 px-5 text-sm"
      } ${BUTTONS[variant]} ${className}`}
    >
      {busy && <CircleNotch size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-[0_1px_0_rgba(23,20,21,0.04),0_12px_32px_-20px_rgba(23,20,21,0.25)] ring-1 ring-bone/[0.06] md:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-semibold text-bone">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export const FIELD =
  "w-full rounded-xl bg-night/50 px-3.5 py-2.5 text-base text-bone md:text-[15px] ring-1 ring-inset ring-bone/12 placeholder:text-sage/70 transition-shadow focus:bg-white focus:outline-none focus:ring-2 focus:ring-route";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-bone">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-sage">{hint}</p>}
    </div>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={`${FIELD} ${props.className ?? ""}`} />;
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={`${FIELD} resize-y ${props.className ?? ""}`} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`${FIELD} ${props.className ?? ""}`} />;

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 disabled:opacity-50 ${
        checked ? "bg-emerald-600" : "bg-bone/20"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
        className={`h-5 w-5 rounded-full bg-white shadow ${checked ? "ml-6" : "ml-1"}`}
      />
    </button>
  );
}

/* Two-step destructive button: the first press asks, the second does it. */
export function ConfirmButton({ onConfirm, children, prompt = "Sicher?", busy }: { onConfirm: () => void; children: ReactNode; prompt?: string; busy?: boolean }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const id = window.setTimeout(() => setAsking(false), 4000);
    return () => window.clearTimeout(id);
  }, [asking]);
  return asking ? (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-sm text-sage">{prompt}</span>
      <Button size="sm" variant="primary" busy={busy} onClick={onConfirm}>
        Ja
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
        Nein
      </Button>
    </span>
  ) : (
    <Button size="sm" variant="danger" onClick={() => setAsking(true)}>
      {children}
    </Button>
  );
}

/* Slides up when an editor has unsaved changes; also warns before leaving the page. */
export function SaveBar({ dirty, busy, onSave, onDiscard }: { dirty: boolean; busy: boolean; onSave: () => void; onDiscard: () => void }) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="sticky bottom-4 z-30 mt-8 flex items-center justify-between gap-4 rounded-full bg-asphalt py-2 pl-5 pr-2 text-chrome shadow-[0_20px_50px_-20px_rgba(23,20,21,0.8)]"
        >
          <span className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold" /> Ungespeicherte Änderungen
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-chrome hover:bg-chrome/10" onClick={onDiscard} disabled={busy}>
              Verwerfen
            </Button>
            <Button size="sm" variant="primary" busy={busy} onClick={onSave}>
              Speichern &amp; veröffentlichen
            </Button>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Local copy of a section for editing, with a dirty flag against what was loaded. */
export function useDraft<T>(initial: T) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  // When the server sends fresh data (after a save elsewhere), adopt it if nothing is pending.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setSaved(initial);
    setDraft(initial);
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  return { draft, setDraft, dirty, discard: () => setDraft(saved), markSaved: () => setSaved(draft) };
}

/* ---------- Booking status ---------- */

export const STATUS_META: Record<BookingStatus, { label: string; Icon: Icon; className: string }> = {
  pending: { label: "Offen", Icon: Clock, className: "bg-gold/15 text-[#8a5a10]" },
  confirmed: { label: "Bestätigt", Icon: CheckCircle, className: "bg-route/12 text-route" },
  seated: { label: "Am Tisch", Icon: Armchair, className: "bg-emerald-600/12 text-emerald-800" },
  cancelled: { label: "Storniert", Icon: Prohibit, className: "bg-bone/8 text-sage" },
  "no-show": { label: "Nicht erschienen", Icon: UserMinus, className: "bg-amber/12 text-amber" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, Icon, className } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <Icon size={13} weight="bold" aria-hidden="true" />
      {label}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="display text-4xl text-bone md:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-sage">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
