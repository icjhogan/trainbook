import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] px-4 py-2.5 glass-button rounded-[18px] rounded-br-[4px]">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="chat-markdown text-[15px] leading-[1.65] text-[var(--color-text)]">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
