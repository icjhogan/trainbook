"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessage } from "./chat-message";
import { Toast } from "./toast";
import { createClient } from "@/lib/supabase/client";
import { selectUnpersisted } from "@/lib/chat-persistence";
import { useChatContext } from "@/lib/chat-context";
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
  const [loadingChats, setLoadingChats] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState("");
  const supabase = createClient();
  const { attachedWorkout, clearAttachment } = useChatContext();

  // Ids of messages already written to the DB, so each turn inserts only new rows
  // (append-only) instead of delete-all-then-reinsert. Seeded on load, reset on new chat.
  const persistedIds = useRef<Set<string>>(new Set());
  // The chat a stream belongs to, captured at send time, so a thread switch mid-stream
  // can't persist the completed turn into the wrong thread.
  const streamingChatId = useRef<string | null>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId: activeChatId },
    }),
    // Surface 429 (rate limited), 400 (bad/oversized request), and mid-stream
    // failures instead of leaving the input frozen with no feedback.
    onError: (err) => setToast(err.message || "Something went wrong"),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Load chat list
  const loadChats = useCallback(async () => {
    const { data, error } = await supabase
      .from("chats")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setToast("Couldn't load chats");
    setChats(data || []);
    setLoadingChats(false);
  }, [supabase]);

  const hasHandledAttachment = useRef(false);

  useEffect(() => {
    if (!open) {
      hasHandledAttachment.current = false;
      return;
    }

    // If opening with an attached workout, create one new thread
    if (attachedWorkout && !hasHandledAttachment.current) {
      hasHandledAttachment.current = true;
      startNewChat();
      return;
    }

    // Normal open — show chat list
    loadChats();
    if (!activeChatId) setView("list");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    // Persist to the thread the stream belongs to (captured at send time), not whatever
    // thread happens to be active now.
    const chatId = streamingChatId.current ?? activeChatId;
    if (!chatId) return;

    // Insert only messages not yet persisted — append-only, no destructive delete.
    const newMessages = selectUnpersisted(messages, persistedIds.current);
    if (newMessages.length === 0) return;

    const rows = newMessages.map((m) => ({
      chat_id: chatId,
      role: m.role,
      content: getMessageText(m),
    }));

    const { error } = await supabase.from("chat_messages").insert(rows);
    if (error) {
      // Leave persistedIds untouched so the next turn retries these rows; surface the failure.
      setToast("Couldn't save chat");
      return;
    }
    newMessages.forEach((m) => persistedIds.current.add(m.id));

    // Update chat title from first user message
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser) {
      const title = getMessageText(firstUser).slice(0, 60);
      const { error: titleError } = await supabase
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", chatId);
      if (titleError) console.error("Failed to update chat title:", titleError);
    }

    loadChats();
  }

  async function openChat(chatId: string) {
    // Don't switch threads mid-stream: openChat replaces the useChat message store and
    // the persisted-id set, which would tear the in-flight stream out from under itself.
    if (isLoading) return;
    setActiveChatId(chatId);

    // Load messages
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      setToast("Couldn't load chat");
      return;
    }

    const saved = (data || []) as SavedMessage[];

    // Convert to useChat format
    setMessages(
      saved.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        parts: [{ type: "text" as const, text: m.content }],
      }))
    );
    // These rows are already in the DB — don't re-insert them on the next save.
    persistedIds.current = new Set(saved.map((m) => m.id));
    streamingChatId.current = chatId;

    setView("thread");
  }

  async function startNewChat() {
    // Don't start/switch threads mid-stream (would orphan the in-flight turn).
    if (isLoading) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("chats")
      .insert({ user_id: user.id, title: "New chat" })
      .select("id")
      .single();

    if (data) {
      setActiveChatId(data.id);
      setMessages([]);
      persistedIds.current = new Set();
      streamingChatId.current = data.id;
      setView("thread");
    } else {
      if (error) console.error("Failed to create chat:", error);
      setToast("Couldn't start a chat");
    }
  }

  async function deleteChat(chatId: string) {
    const { error } = await supabase.from("chats").delete().eq("id", chatId);
    if (error) {
      setToast("Couldn't delete chat");
      return;
    }
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setView("list");
    }
    loadChats();
  }

  function startRename(chat: Chat) {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  }

  async function submitRename() {
    if (!editingChatId || !editTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    const { error } = await supabase
      .from("chats")
      .update({ title: editTitle.trim() })
      .eq("id", editingChatId);
    setEditingChatId(null);
    if (error) {
      setToast("Couldn't rename chat");
      return;
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

    let text = input;

    // If there's an attached workout and this is the first message, include it
    if (attachedWorkout && messages.length === 0) {
      const w = attachedWorkout;
      const exercises = (w.exercises || [])
        .map((ex) => {
          let line = ex.description;
          if (ex.times?.length) line += ` (${ex.times.join(", ")})`;
          return `- ${line}`;
        })
        .join("\n");

      const context = [
        `[Referring to workout: ${w.date} — ${w.workout_type}]`,
        exercises,
        w.technical_cues?.length ? `Cues: ${w.technical_cues.join("; ")}` : "",
        w.personal_notes ? `Notes: ${w.personal_notes}` : "",
      ].filter(Boolean).join("\n");

      text = `${context}\n\n${input}`;
      clearAttachment();
    }

    // Bind this stream to the current thread so the completed turn persists here even
    // if the user navigates away mid-stream.
    streamingChatId.current = activeChatId;
    sendMessage({ text });
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
      <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
      {/* Handle bar */}
      <div className="flex justify-center pt-2 pb-0.5">
        <div className="w-9 h-1 rounded-full bg-[var(--color-border)]" />
      </div>

      {view === "list" ? (
        /* ─── Chat List ─── */
        <>
          <div className="relative flex items-center justify-between px-5 h-11 border-b border-[var(--color-separator)]">
            <button
              onClick={handleClose}
              className="text-[15px] text-[var(--color-secondary)] font-medium min-h-[44px] flex items-center active:opacity-50"
            >
              Done
            </button>
            <span className="text-[15px] font-medium absolute left-1/2 -translate-x-1/2">Chats</span>
            <button
              onClick={startNewChat}
              className="min-h-[44px] flex items-center active:opacity-50"
              aria-label="New chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
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
                  <div
                    key={chat.id}
                    className="flex items-center py-3 border-b border-[var(--color-separator)]"
                  >
                    {editingChatId === chat.id ? (
                      /* Inline rename */
                      <form
                        onSubmit={(e) => { e.preventDefault(); submitRename(); }}
                        className="flex-1 flex items-center gap-2"
                      >
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={submitRename}
                          className="flex-1 text-[15px] bg-[var(--color-surface)] px-3 py-1.5 rounded-[var(--radius-sm)] outline-none"
                        />
                      </form>
                    ) : (
                      /* Normal row */
                      <button
                        onClick={() => openChat(chat.id)}
                        className="flex-1 text-left min-w-0 mr-2 active:opacity-60 transition-opacity"
                      >
                        <p className="text-[15px] truncate">{chat.title}</p>
                        <p className="text-caption text-[var(--color-muted)] mt-0.5">
                          {new Date(chat.updated_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </button>
                    )}

                    {editingChatId !== chat.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startRename(chat)}
                          className="w-[36px] h-[36px] flex items-center justify-center rounded-full active:bg-[var(--color-surface)] transition-colors"
                          aria-label="Rename"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteChat(chat.id)}
                          className="w-[36px] h-[36px] flex items-center justify-center rounded-full active:bg-[var(--color-surface)] transition-colors"
                          aria-label="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
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
            {/* Attached workout indicator */}
            {attachedWorkout && messages.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-2 mb-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)] animate-fade-in">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[var(--color-muted)]">Asking about</p>
                  <p className="text-[13px] font-medium truncate">{attachedWorkout.date} — {attachedWorkout.workout_type}</p>
                </div>
                <button
                  onClick={clearAttachment}
                  className="w-[24px] h-[24px] flex items-center justify-center rounded-full active:bg-[var(--color-surface-raised)]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className="glass-pill flex items-end gap-2 rounded-[20px] px-4 py-1.5"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachedWorkout && messages.length === 0 ? "Ask about this workout..." : "Message..."}
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
