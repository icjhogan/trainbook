// Append-only chat persistence: given the messages currently in the UI and the set of
// message ids already written to the DB, return only the rows that still need inserting.
// Extracted from chat-panel so the dedup rule (the regression-prone part) is unit-testable
// without a DOM/useChat/supabase harness.
export function selectUnpersisted<T extends { id: string }>(
  messages: T[],
  persistedIds: Set<string>,
): T[] {
  return messages.filter((m) => !persistedIds.has(m.id));
}
