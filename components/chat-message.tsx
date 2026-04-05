interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 animate-fade-in`}>
      <div
        className={`max-w-[82%] px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "bg-[var(--color-text)] text-white rounded-[18px] rounded-br-[4px]"
            : "bg-[var(--color-surface)] text-[var(--color-text)] rounded-[18px] rounded-bl-[4px]"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
