import { describe, it, expect } from "vitest";
import { collectCitations, extractCitationIds, applyCitations } from "./chat-citations";

describe("collectCitations", () => {
  it("collects {id,date} from nested tool-result shapes", () => {
    const toolParts = [
      { type: "tool-compute_metric", output: { meters: 1200, citations: [{ id: "a", date: "Mar 1", date_iso: "2026-03-01" }] } },
      { type: "tool-event_coverage", output: { events: [{ event: "Hurdles", citations: [{ id: "b", date: "Mar 2", date_iso: "2026-03-02" }] }] } },
    ];
    const map = collectCitations(toolParts);
    expect(map).toEqual({ a: "Mar 1", b: "Mar 2" });
  });

  it("ignores objects missing the citation shape", () => {
    expect(collectCitations({ id: "x", date: "no iso" })).toEqual({});
  });
});

describe("extractCitationIds", () => {
  it("pulls all marker ids from text", () => {
    expect(extractCitationIds("up in March [[a1]] and again [[b2]].")).toEqual(["a1", "b2"]);
  });
});

describe("applyCitations", () => {
  const map = { a1: "March 1", b2: "March 2" };

  it("turns known ids into markdown links and drops unknown ids", () => {
    const out = applyCitations("rose [[a1]] but not [[zzz]] here", map, false);
    expect(out).toBe("rose [March 1](#cite-a1) but not  here");
  });

  it("hides an incomplete trailing marker while streaming", () => {
    expect(applyCitations("volume climbed [[a1", map, true)).toBe("volume climbed ");
    // but a complete marker still renders mid-stream
    expect(applyCitations("volume [[a1]] climbed [[b", map, true)).toBe("volume [March 1](#cite-a1) climbed ");
  });

  it("leaves a complete unknown marker removed, not raw", () => {
    expect(applyCitations("text [[ghost]]", map, false)).toBe("text ");
  });
});
