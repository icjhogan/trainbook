"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onDone: () => void;
}

export function Toast({ message, visible, onDone }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDone, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-[var(--color-text)] text-[var(--color-surface)] text-sm rounded-full animate-fade-in">
      {message}
    </div>
  );
}
