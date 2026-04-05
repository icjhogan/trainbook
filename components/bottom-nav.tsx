"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-[var(--color-bg)]/80 border-t border-[var(--color-border)]">
      <div className="flex items-center justify-around h-[49px] max-w-[430px] mx-auto">
        <NavLink href="/feed" active={pathname.startsWith("/feed")}>
          entries
        </NavLink>

        <Link
          href="/upload"
          className="flex items-center justify-center w-[44px] h-[44px] active:scale-90 transition-transform"
        >
          <span className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--color-text)] text-white text-[18px] font-light leading-none">
            +
          </span>
        </Link>

        <NavLink href="/dashboard" active={pathname.startsWith("/dashboard")}>
          dashboard
        </NavLink>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
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
      className={`flex items-center justify-center min-w-[44px] min-h-[44px] text-[13px] tracking-wide active:opacity-50 ${
        active
          ? "text-[var(--color-text)] font-medium"
          : "text-[var(--color-muted)]"
      }`}
    >
      {children}
    </Link>
  );
}
