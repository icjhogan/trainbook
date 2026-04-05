"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessage } from "./chat-message";
import { useRef, useEffect, useState } from "react";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      // Small delay to let animation start before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function getMessageText(message: (typeof messages)[number]): string {
    return message.parts
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-5 z-30 w-[38px] h-[38px] rounded-full bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        aria-label="Open chat"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9.005 9.005 0 0 1-7.2-3.6L3 21l2.4-4.8A9 9 0 0 1 12 3z" />
        </svg>
      </button>

      {/* Full-screen sheet */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col animate-slide-up">
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 h-11">
            <span className="text-subheading">chat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-[15px] text-[var(--color-accent)] font-medium min-w-[44px] min-h-[44px] flex items-center justify-end active:opacity-50"
            >
              done
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-60">
                <p className="text-body text-[var(--color-muted)] text-center">
                  ask anything about<br />your training
                </p>
              </div>
            )}
            <div className="space-y-1">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  role={m.role as "user" | "assistant"}
                  content={getMessageText(m)}
                />
              ))}
            </div>
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="mt-3">
                <div className="inline-flex gap-1 px-4 py-2.5 rounded-2xl bg-[var(--color-surface)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-pulse-soft" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-pulse-soft" style={{ animationDelay: "200ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-pulse-soft" style={{ animationDelay: "400ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="px-4 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 border-t border-[var(--color-separator)]"
          >
            <div className="flex items-end gap-2 bg-[var(--color-surface)] rounded-full px-4 py-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your training..."
                rows={1}
                className="flex-1 text-[15px] bg-transparent outline-none resize-none py-2.5 max-h-24 placeholder:text-[var(--color-muted)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center w-[32px] h-[32px] rounded-full bg-[var(--color-text)] text-white mb-0.5 disabled:opacity-20 active:scale-90 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
