"use client";
import { useEffect, useState } from "react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

let toastListeners: ((t: Toast) => void)[] = [];

export function toast(message: string, type: Toast["type"] = "success") {
  const t: Toast = { id: Math.random().toString(36), message, type };
  toastListeners.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    toastListeners.push(fn);
    return () => { toastListeners = toastListeners.filter((f) => f !== fn); };
  }, []);

  const colors: Record<Toast["type"], string> = {
    success: "bg-[#00A550] text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`${colors[t.type]} px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-up max-w-xs`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
