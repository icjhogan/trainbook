"use client";

// Error boundary for the authenticated app segment. feed/page.tsx and dashboard/page.tsx
// throw on a Supabase read failure (rather than rendering a misleading empty state); this
// renders a recoverable message instead of Next's default 500 screen.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 text-center">
      <p className="text-body text-[var(--color-secondary)]">
        Something went wrong loading your data.
      </p>
      <button
        onClick={reset}
        className="mt-4 px-5 py-2 rounded-full bg-[var(--color-surface)] text-[14px] text-[var(--color-text)] font-medium active:scale-95 transition-transform"
      >
        Try again
      </button>
    </div>
  );
}
