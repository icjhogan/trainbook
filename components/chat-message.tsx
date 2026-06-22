import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { applyCitations, type CitationMap } from "@/lib/chat-citations";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  /** Validated id -> date label for [[id]] citation markers. */
  citations?: CitationMap;
  /** While true, an incomplete trailing citation marker is hidden. */
  streaming?: boolean;
  /** Tap handler for a citation chip — opens that workout. */
  onCite?: (id: string) => void;
}

export function ChatMessage({ role, content, citations = {}, streaming = false, onCite }: ChatMessageProps) {
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

  // [[id]] markers -> validated #cite- links, which render as tap-to-open chips below.
  const prepared = applyCitations(content, citations, streaming);

  return (
    <div className="animate-fade-in">
      <div className="chat-markdown text-[15px] leading-[1.65] text-[var(--color-text)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ href, children }) {
              if (href?.startsWith("#cite-")) {
                const id = href.slice("#cite-".length);
                return (
                  <button
                    type="button"
                    onClick={() => onCite?.(id)}
                    className="citation-chip inline-flex items-center gap-1 align-baseline px-1.5 py-[1px] mx-0.5 rounded-[6px] bg-[var(--color-surface)] text-[12px] text-[var(--color-secondary)] active:opacity-60 transition-opacity"
                  >
                    <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-accent)]" />
                    {children}
                  </button>
                );
              }
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            },
          }}
        >
          {prepared}
        </ReactMarkdown>
      </div>
    </div>
  );
}
