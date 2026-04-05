"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessage } from "./chat-message";
import { useRef, useEffect, useState } from "react";

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ open, onClose }: ChatPanelProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col animate-slide-up">
      {/* Handle bar */}
      <div className="flex justify-center pt-2 pb-0.5">
        <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
      </div>

      {/* Header — Claude style: centered title, close on right */}
      <div className="flex items-center justify-center relative px-5 h-11 border-b border-[var(--color-separator)]">
        <span className="text-[15px] font-medium">notebook ai</span>
        <button
          onClick={onClose}
          className="absolute right-3 text-[15px] text-[var(--color-secondary)] font-medium min-w-[44px] min-h-[44px] flex items-center justify-end active:opacity-50"
        >
          Done
        </button>
      </div>

      {/* Messages — Claude style: centered, max-width, spacious */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-[600px] mx-auto px-5 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <p className="text-body text-[var(--color-secondary)] text-center">
                Ask anything about your training
              </p>
              <p className="text-caption text-[var(--color-muted)] text-center mt-1">
                I can search your workouts, find patterns, and answer questions
              </p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as "user" | "assistant"}
                content={getMessageText(m)}
              />
            ))}
          </div>

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="mt-6 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-pulse-soft" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-pulse-soft" style={{ animationDelay: "200ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)] animate-pulse-soft" style={{ animationDelay: "400ms" }} />
            </div>
          )}
        </div>
      </div>

      {/* Input — Claude style: rounded container, clean */}
      <div className="px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] px-4 py-1.5"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            rows={1}
            className="flex-1 text-[15px] bg-transparent outline-none resize-none py-2 max-h-[120px] placeholder:text-[var(--color-muted)]"
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
            className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--color-text)] text-[var(--color-bg)] mb-0.5 disabled:opacity-20 active:scale-90 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
