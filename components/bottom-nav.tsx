"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/feed", label: "entries" },
  { href: "/upload", label: "+" },
  { href: "/dashboard", label: "dashboard" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      <div className="flex items-center justify-around h-[52px] max-w-[430px] mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const isUpload = tab.href === "/upload";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] text-sm tracking-wide transition-opacity ${
                isUpload
                  ? "font-semibold text-[var(--color-text)] text-lg"
                  : isActive
                    ? "font-medium text-[var(--color-text)]"
                    : "text-[var(--color-muted)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
