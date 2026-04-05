interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={`mb-4 ${role === "user" ? "text-right" : "text-left"}`}
    >
      <p
        className={`inline-block text-sm leading-relaxed max-w-[85%] ${
          role === "user"
            ? "text-[var(--color-text)]"
            : "text-[var(--color-muted)]"
        }`}
      >
        {content}
      </p>
    </div>
  );
}
