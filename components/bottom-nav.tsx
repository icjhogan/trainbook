"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[calc(8px+env(safe-area-inset-bottom))] px-5 pointer-events-none">
      <nav className="flex items-center gap-1 h-[48px] px-2 rounded-full bg-[var(--color-text)]/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.15)] pointer-events-auto">
        <NavLink href="/feed" active={pathname.startsWith("/feed")}>
          entries
        </NavLink>

        <Link
          href="/upload"
          className="flex items-center justify-center w-[40px] h-[40px] mx-1 rounded-full bg-white/20 active:bg-white/30 active:scale-90 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>

        <NavLink href="/dashboard" active={pathname.startsWith("/dashboard")}>
          dashboard
        </NavLink>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center h-[36px] px-4 rounded-full text-[13px] tracking-wide transition-all active:scale-95 ${
        active
          ? "bg-white/20 text-white font-medium"
          : "text-white/50"
      }`}
    >
      {children}
    </Link>
  );
}
