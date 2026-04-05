"use client";

import Link from "next/link";

interface BottomNavProps {
  onOpenChat: () => void;
  onOpenSearch: () => void;
}

export function BottomNav({ onOpenChat, onOpenSearch }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-[calc(20px+env(safe-area-inset-bottom))] px-5 pointer-events-none">
      <div className="flex items-end gap-2 max-w-[430px] mx-auto">
        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="glass-button flex items-center justify-center w-[44px] h-[44px] rounded-full text-[var(--color-secondary)] active:scale-90 transition-all pointer-events-auto"
          aria-label="Search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Ask AI */}
        <button
          onClick={onOpenChat}
          className="glass-pill flex-1 flex items-center h-[44px] px-4 gap-2.5 rounded-full active:scale-[0.98] transition-all pointer-events-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span className="text-[14px] text-[var(--color-muted)] font-normal">Ask about your training...</span>
        </button>

        {/* New entry */}
        <Link
          href="/upload"
          className="glass-button flex items-center justify-center w-[44px] h-[44px] rounded-full text-[var(--color-secondary)] active:scale-90 transition-all pointer-events-auto"
          aria-label="New entry"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
