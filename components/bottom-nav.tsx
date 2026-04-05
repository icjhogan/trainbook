"use client";

import Link from "next/link";

interface BottomNavProps {
  onOpenChat: () => void;
  onOpenSearch: () => void;
}

export function BottomNav({ onOpenChat, onOpenSearch }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[calc(8px+env(safe-area-inset-bottom))] px-5 pointer-events-none">
      <nav className="flex items-center gap-1 h-[44px] px-1.5 rounded-full bg-[var(--color-text)]/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.15)] pointer-events-auto">
        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="flex items-center justify-center w-[36px] h-[36px] rounded-full text-white/50 active:bg-white/10 active:scale-90 transition-all"
          aria-label="Search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Ask AI */}
        <button
          onClick={onOpenChat}
          className="flex items-center justify-center h-[36px] px-4 gap-1.5 rounded-full bg-white/15 active:bg-white/25 active:scale-95 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9.005 9.005 0 0 1-7.2-3.6L3 21l2.4-4.8A9 9 0 0 1 12 3z" />
          </svg>
          <span className="text-[13px] text-white font-medium">Ask AI</span>
        </button>

        {/* New entry */}
        <Link
          href="/upload"
          className="flex items-center justify-center w-[36px] h-[36px] rounded-full text-white/50 active:bg-white/10 active:scale-90 transition-all"
          aria-label="New entry"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </Link>
      </nav>
    </div>
  );
}
