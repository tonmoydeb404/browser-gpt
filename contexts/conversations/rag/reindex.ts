/**
 * Tiny event-bus so the RAG status UI (deep in the message tree, no settings
 * access) can trigger a re-index of the active page. The handler is registered
 * once at the app root where the API key + model are available.
 *
 * Re-indexing always targets the *currently active tab* (not a historical
 * message's URL), since that is what the user is viewing.
 */
export type ReindexHandler = () => Promise<{ title: string; url: string }>;

let handler: ReindexHandler | null = null;

export function setReindexHandler(h: ReindexHandler | null): void {
  handler = h;
}

export function isReindexAvailable(): boolean {
  return handler !== null;
}

/** Throws if no handler is registered or the active page can't be indexed. */
export async function reindexActivePage(): Promise<{ title: string; url: string }> {
  if (!handler) {
    throw new Error("Re-index unavailable — open a page first.");
  }
  return handler();
}
