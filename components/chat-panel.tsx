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
    if (open && inputRef.current) {
      inputRef.current.focus();
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
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] right-4 z-30 w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-sm text-[var(--color-muted)] active:opacity-50 transition-opacity"
        aria-label="Open chat"
      >
        ?
      </button>

      {/* Full-screen sheet */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] h-14">
            <span className="text-sm text-[var(--color-muted)]">chat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-[var(--color-muted)] min-w-[44px] min-h-[44px] flex items-center justify-end"
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
              <p className="text-sm text-[var(--color-muted)] text-center mt-20">
                ask anything about your training
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as "user" | "assistant"}
                content={getMessageText(m)}
              />
            ))}
            {isLoading && (
              <p className="text-sm text-[var(--color-muted)] animate-pulse">
                ...
              </p>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 border-t border-[var(--color-border)]"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ask about your training..."
                rows={1}
                className="flex-1 text-base bg-transparent outline-none resize-none py-2 max-h-24"
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
                className="text-sm font-medium text-[var(--color-text)] disabled:text-[var(--color-muted)] min-h-[44px] px-2 transition-colors"
              >
                send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
