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
    <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      <div className="h-[env(safe-area-inset-top)]" />
      <div className="flex items-center justify-between h-[56px] px-5 pt-2 max-w-[430px] mx-auto">
        {/* Left — back button on sub-pages only */}
        {!isHome ? (
          <button
            onClick={() => router.push("/feed")}
            className="glass-button flex items-center justify-center w-[34px] h-[34px] rounded-full active:scale-90 transition-transform pointer-events-auto"
          >
            <svg
              width="18"
              height="18"
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
        ) : (
          <div />
        )}

        {/* Right — menu */}
        <div className="relative pointer-events-auto" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="glass-button flex items-center justify-center w-[34px] h-[34px] rounded-full active:scale-90 transition-transform"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="5" cy="12" r="1.5" fill="var(--color-secondary)" />
              <circle cx="12" cy="12" r="1.5" fill="var(--color-secondary)" />
              <circle cx="19" cy="12" r="1.5" fill="var(--color-secondary)" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[40px] w-[180px] glass-dropdown rounded-[var(--radius)] py-1 animate-fade-in z-50">
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[14px] active:bg-white/5 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Dashboard
              </Link>
              <div className="h-px bg-white/5 mx-3 my-1" />
              <button
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--color-secondary)] active:bg-white/5 transition-colors"
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
    </div>
  );
}
