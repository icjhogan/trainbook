import { describe, expect, it } from "vitest";
import { selectUnpersisted } from "./chat-persistence";

const msg = (id: string) => ({ id, role: "user" as const });

describe("selectUnpersisted", () => {
  it("returns only messages whose id is not already persisted", () => {
    const messages = [msg("a"), msg("b"), msg("c")];
    const persisted = new Set(["a", "b"]);
    expect(selectUnpersisted(messages, persisted)).toEqual([msg("c")]);
  });

  it("returns nothing when every message is already persisted (re-save is a no-op)", () => {
    const messages = [msg("a"), msg("b")];
    const persisted = new Set(["a", "b"]);
    expect(selectUnpersisted(messages, persisted)).toEqual([]);
  });

  it("returns all messages for a fresh thread with no persisted ids", () => {
    const messages = [msg("a"), msg("b")];
    expect(selectUnpersisted(messages, new Set())).toEqual(messages);
  });

  it("inserts only the new turn after a prior turn was persisted", () => {
    // user+assistant persisted, then a new user+assistant turn arrives
    const messages = [msg("u1"), msg("a1"), msg("u2"), msg("a2")];
    const persisted = new Set(["u1", "a1"]);
    expect(selectUnpersisted(messages, persisted)).toEqual([msg("u2"), msg("a2")]);
  });

  it("does not skip a genuinely new message that shares no id, even if a duplicate id appears", () => {
    // Defensive: if the SDK ever reused an id, the already-persisted one is correctly skipped
    // and only the unpersisted id passes through.
    const messages = [msg("dup"), msg("new")];
    const persisted = new Set(["dup"]);
    expect(selectUnpersisted(messages, persisted)).toEqual([msg("new")]);
  });
});
