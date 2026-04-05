"use client";

import { BottomNav } from "@/components/bottom-nav";
import { ChatPanel } from "@/components/chat-panel";
import { useState } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <main className="pb-[calc(68px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <BottomNav
        onOpenChat={() => setChatOpen(true)}
        onOpenSearch={() => setSearchOpen(!searchOpen)}
      />
    </div>
  );
}
