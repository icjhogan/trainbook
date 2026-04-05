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
      const timer = setTimeout(onDone, 2200);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed top-[max(12px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 bg-[var(--color-text)] text-white text-[13px] font-medium rounded-full shadow-lg animate-fade-in tracking-wide">
      {message}
    </div>
  );
}
