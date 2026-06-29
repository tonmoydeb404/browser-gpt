import { browser } from "wxt/browser";

/**
 * Transient mailbox that carries a context-menu text selection from the
 * background service worker to the side panel.
 *
 * Uses `storage.session` because it is shared between the worker and extension
 * pages, survives the side-panel boot delay, and is cleared on browser restart.
 */

export interface PendingSelection {
  text: string;
  pageUrl: string;
  pageTitle: string;
  tabId?: number;
  timestamp: number;
}

const KEY = "pending-selection";

export async function setPendingSelection(
  selection: PendingSelection,
): Promise<void> {
  await browser.storage.session.set({ [KEY]: selection });
}

/** Read and remove a pending selection (single-consumer pickup). */
export async function consumePendingSelection(): Promise<PendingSelection | null> {
  const data = await browser.storage.session.get(KEY);
  const pending = data[KEY] as PendingSelection | undefined;
  if (pending) {
    await browser.storage.session.remove(KEY);
  }
  return pending ?? null;
}

export async function clearPendingSelection(): Promise<void> {
  await browser.storage.session.remove(KEY);
}

type SelectionHandler = (selection: PendingSelection) => void;

export function onPendingSelection(handler: SelectionHandler): () => void {
  const listener = (
    changes: { [key: string]: Browser.storage.StorageChange },
    area: string,
  ) => {
    if (area !== "session") return;
    const change = changes[KEY];
    if (change?.newValue) {
      handler(change.newValue as PendingSelection);
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
