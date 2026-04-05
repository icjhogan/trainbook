"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const isHome = pathname === "/feed" || pathname === "/";

  // Close menu on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    function handleTap(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleTap);
    return () => document.removeEventListener("mousedown", handleTap);
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="h-[env(safe-area-inset-top)]" />
      <div className="flex items-center justify-between h-[44px] px-5 max-w-[430px] mx-auto">
        {/* Left side */}
        {isHome ? (
          <div className="min-w-[44px]" />
        ) : (
          <button
            onClick={() => router.push("/feed")}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-3 active:opacity-50 transition-opacity"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Right side — menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 active:opacity-50 transition-opacity"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[40px] w-[180px] bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-lg py-1 animate-fade-in z-50">
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[14px] active:bg-[var(--color-surface)] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Dashboard
              </Link>
              <div className="h-px bg-[var(--color-separator)] mx-3 my-1" />
              <button
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--color-secondary)] active:bg-[var(--color-surface)] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
