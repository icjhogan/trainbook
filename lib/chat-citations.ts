// Citation handling for the agentic chat (KTD7). The assistant emits inline markers of the
// form [[<workout-id>]]. We render a marker as a tappable chip ONLY when its id is known to
// be real — either it appeared in a tool result this turn (live) or it resolved to a real
// workout on reload. Unknown ids are dropped, so a hallucinated id never becomes a citation.

export type CitationMap = Record<string, string>; // workout id -> human date label

// Deep-walk a value (a message's tool-result parts) collecting citation candidates: any
// object carrying a string id + date + date_iso (both tool `citations` entries and the
// summarized workouts the tools return have this shape).
export function collectCitations(value: unknown, out: CitationMap = {}): CitationMap {
  if (Array.isArray(value)) {
    for (const v of value) collectCitations(v, out);
    return out;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.id === "string" && typeof o.date === "string" && typeof o.date_iso === "string") {
      out[o.id] = o.date;
    }
    for (const v of Object.values(o)) collectCitations(v, out);
    return out;
  }
  return out;
}

// All [[id]] markers present in a piece of text.
export function extractCitationIds(content: string): string[] {
  const ids: string[] = [];
  const re = /\[\[([^\]\s]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.push(m[1]);
  return ids;
}

// Rewrite [[id]] markers into markdown links to validated citations (#cite-<id>), which the
// renderer turns into tap-to-open chips. Unknown ids are removed entirely. While streaming,
// an incomplete trailing marker ("[[ab") is hidden so a half-formed chip never flashes.
export function applyCitations(content: string, citations: CitationMap, streaming: boolean): string {
  let text = content;
  // Hide an incomplete trailing marker while streaming — matches both "[[ab" (no closing
  // bracket) and "[[ab]" (one of two), so a half-formed chip never flashes.
  if (streaming) text = text.replace(/\[\[[^\]]*\]?$/g, "");
  return text.replace(/\[\[([^\]\s]+)\]\]/g, (_match, id: string) => {
    const date = citations[id];
    return date ? `[${date}](#cite-${id})` : "";
  });
}
