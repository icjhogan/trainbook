"use client";

import { usePathname, useRouter } from "next/navigation";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/feed" || pathname === "/";
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur-xl">
      <div className="h-[env(safe-area-inset-top)]" />
      <div className="flex items-center h-[44px] px-5 max-w-[430px] mx-auto">
        {isHome ? (
          <h1 className="text-[17px] font-semibold tracking-tight">
            notebook
          </h1>
        ) : (
          <>
            <button
              onClick={() => router.push("/feed")}
              className="flex items-center gap-1 min-h-[44px] min-w-[44px] -ml-2 pr-2 active:opacity-50 transition-opacity"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="text-[15px]">
                entries
              </span>
            </button>
            <span className="flex-1" />
            <span className="text-[13px] text-[var(--color-muted)]">
              {pageTitle}
            </span>
          </>
        )}
      </div>
    </header>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/upload")) return "new entry";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  return "";
}
