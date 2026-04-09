"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "info" | "success" | "error";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
};

type ToastContextValue = {
  toast: (message: string, options?: ToastOptions) => void;
};

type ToastOptions = {
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DEFAULT_DURATION = 5000;

const variantClasses: Record<ToastVariant, string> = {
  info: "border-border/60 text-foreground",
  success: "border-success/40 text-foreground",
  error: "border-destructive/40 text-foreground"
};

const variantIconColors: Record<ToastVariant, string> = {
  info: "text-primary",
  success: "text-success",
  error: "text-destructive"
};

const createToastId = () => {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
};

type ToastEntryProps = {
  item: ToastItem;
  onDismiss: (id: string) => void;
};

const ToastEntry = ({ item, onDismiss }: ToastEntryProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, item.action ? TOAST_DEFAULT_DURATION * 2 : TOAST_DEFAULT_DURATION);

    const removeTimer = setTimeout(() => {
      onDismiss(item.id);
    }, item.action ? TOAST_DEFAULT_DURATION * 2 + 300 : TOAST_DEFAULT_DURATION + 300);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, item.action, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-lg backdrop-blur-xl dark:shadow-black/20",
        variantClasses[item.variant],
        isExiting ? "animate-toast-exit" : "animate-fade-in-up"
      )}
    >
      <div className="flex-1 text-sm leading-relaxed">{item.message}</div>
      {item.action ? (
        <button
          type="button"
          onClick={item.action.onClick}
          className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className={cn(
          "shrink-0 rounded-lg p-1 transition-colors hover:bg-muted",
          variantIconColors[item.variant]
        )}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

type ToastProviderProps = {
  children: React.ReactNode;
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, options?: ToastOptions) => {
    const id = createToastId();
    const variant = options?.variant ?? "info";

    setToasts((current) => {
      const next = [...current, { id, message, variant, action: options?.action }];

      if (next.length > 5) {
        const removed = next.shift();
        if (removed) {
          const timer = timersRef.current.get(removed.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(removed.id);
          }
        }
      }

      return next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 ? (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 sm:max-w-md"
        >
          {toasts.map((item) => (
            <ToastEntry key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }

  return context;
};
