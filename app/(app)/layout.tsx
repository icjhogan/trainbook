"use client";

import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { ChatPanel } from "@/components/chat-panel";
import { SearchProvider, useSearch } from "@/lib/search-context";
import { useState } from "react";

function AppShell({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const { isSearching, setIsSearching, setQuery } = useSearch();

  function handleOpenSearch() {
    if (isSearching) {
      setIsSearching(false);
      setQuery("");
    } else {
      setIsSearching(true);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <TopBar />
      <main className="pt-[env(safe-area-inset-top)] pb-[calc(68px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <BottomNav
        onOpenChat={() => setChatOpen(true)}
        onOpenSearch={handleOpenSearch}
      />
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchProvider>
      <AppShell>{children}</AppShell>
    </SearchProvider>
  );
}
