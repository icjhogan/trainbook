"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessage } from "./chat-message";
import { createClient } from "@/lib/supabase/client";
import { useRef, useEffect, useState, useCallback } from "react";

interface Chat {
  id: string;
  title: string;
  updated_at: string;
}

interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

type View = "list" | "thread";

export function ChatPanel({ open, onClose }: ChatPanelProps) {
  const [view, setView] = useState<View>("list");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<SavedMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const supabase = createClient();

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId: activeChatId },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Load chat list
  const loadChats = useCallback(async () => {
    const { data } = await supabase
      .from("chats")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    setChats(data || []);
    setLoadingChats(false);
  }, [supabase]);

  useEffect(() => {
    if (open) {
      loadChats();
      if (!activeChatId) setView("list");
    }
  }, [open, loadChats, activeChatId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when entering thread
  useEffect(() => {
    if (view === "thread" && open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [view, open]);

  // Save messages to DB when assistant finishes
  useEffect(() => {
    if (status === "ready" && activeChatId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        saveMessages();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function saveMessages() {
    if (!activeChatId) return;

    // Delete existing messages and re-insert all
    await supabase.from("chat_messages").delete().eq("chat_id", activeChatId);

    const rows = messages.map((m) => ({
      chat_id: activeChatId,
      role: m.role,
      content: getMessageText(m),
    }));

    await supabase.from("chat_messages").insert(rows);

    // Update chat title from first user message
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser) {
      const title = getMessageText(firstUser).slice(0, 60);
      await supabase
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", activeChatId);
    }

    loadChats();
  }

  async function openChat(chatId: string) {
    setActiveChatId(chatId);

    // Load messages
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    const saved = (data || []) as SavedMessage[];
    setInitialMessages(saved);

    // Convert to useChat format
    setMessages(
      saved.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        parts: [{ type: "text" as const, text: m.content }],
      }))
    );

    setView("thread");
  }

  async function startNewChat() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: "New chat" })
      .select("id")
      .single();

    if (data) {
      setActiveChatId(data.id);
      setMessages([]);
      setInitialMessages([]);
      setView("thread");
    }
  }

  async function deleteChat(chatId: string) {
    await supabase.from("chats").delete().eq("id", chatId);
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setView("list");
    }
    loadChats();
  }

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

  function handleClose() {
    onClose();
    // Keep the active chat so they can resume, but show list next time
    setTimeout(() => setView("list"), 300);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col animate-slide-up">
      {/* Handle bar */}
      <div className="flex justify-center pt-2 pb-0.5">
        <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
      </div>

      {view === "list" ? (
        /* ─── Chat List ─── */
        <>
          <div className="flex items-center justify-between px-5 h-11 border-b border-[var(--color-separator)]">
            <span className="text-[15px] font-medium">Chats</span>
            <div className="flex items-center gap-2">
              <button
                onClick={startNewChat}
                className="text-[15px] text-[var(--color-secondary)] font-medium min-h-[44px] flex items-center active:opacity-50 px-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </button>
              <button
                onClick={handleClose}
                className="text-[15px] text-[var(--color-secondary)] font-medium min-h-[44px] flex items-center active:opacity-50"
              >
                Done
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-caption text-[var(--color-muted)] animate-pulse-soft">Loading...</p>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <p className="text-body text-[var(--color-secondary)]">No conversations yet</p>
                <button
                  onClick={startNewChat}
                  className="mt-4 px-5 py-2 rounded-full bg-[var(--color-surface)] text-[14px] text-[var(--color-text)] font-medium active:scale-95 transition-transform"
                >
                  Start a chat
                </button>
              </div>
            ) : (
              <div className="px-5 py-3">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat.id)}
                    className="w-full flex items-center justify-between py-3 border-b border-[var(--color-separator)] active:opacity-60 transition-opacity text-left group"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-[15px] truncate">{chat.title}</p>
                      <p className="text-caption text-[var(--color-muted)] mt-0.5">
                        {new Date(chat.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ─── Chat Thread ─── */
        <>
          <div className="flex items-center px-3 h-11 border-b border-[var(--color-separator)]">
            <button
              onClick={() => { setView("list"); loadChats(); }}
              className="flex items-center gap-0.5 min-h-[44px] active:opacity-50 pr-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="text-[15px]">Chats</span>
            </button>
            <span className="flex-1" />
            <button
              onClick={handleClose}
              className="text-[15px] text-[var(--color-secondary)] font-medium min-h-[44px] flex items-center active:opacity-50"
            >
              Done
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-[600px] mx-auto px-5 py-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
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

          {/* Input */}
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
        </>
      )}
    </div>
  );
}
