import { browser } from "wxt/browser";
import type { PageContent } from "@/contexts/conversations/dom-utils";
import { setPendingSelection } from "@/contexts/conversations/selection-store";

export default defineBackground(() => {
  // Open the side panel when the toolbar action icon is clicked.
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: unknown) =>
      console.error("Failed to set side panel behavior:", err),
    );

  // Register the "Open in Browser GPT" context menu (selection only).
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "bg-open-selection",
      title: "Open in Browser GPT",
      contexts: ["selection"],
    });
  });

  // Handle context-menu clicks: open the side panel + hand the selection over.
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "bg-open-selection") return;
    if (!info.selectionText || !tab?.id) return;

    // Open the panel synchronously — sidePanel.open requires a user gesture,
    // which is only valid inside the (synchronous) click handler.
    browser.sidePanel
      .open({ tabId: tab.id })
      .catch((err: unknown) =>
        console.error("Failed to open side panel:", err),
      );

    void setPendingSelection({
      text: info.selectionText,
      pageUrl: info.pageUrl ?? tab.url ?? "",
      pageTitle: tab.title ?? "",
      tabId: tab.id,
      timestamp: Date.now(),
    });
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const type = (message as { type?: string }).type;

    // Read & extract the active tab's content for chat/RAG.
    if (type === "bg:read-active-tab") {
      readActiveTab()
        .then((content) => sendResponse({ ok: true, content }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Start the element picker in the active tab's content script.
    if (type === "bg:start-dom-picker") {
      relayToActiveTab<{ ok: boolean }>({ type: "cs:start-picker" })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Stop the active picker in the active tab's content script.
    if (type === "bg:stop-dom-picker") {
      relayToActiveTab<{ ok: boolean }>({ type: "cs:stop-picker" })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    return false;
  });
});

async function readActiveTab(): Promise<PageContent> {
  return relayToActiveTab<PageContent>({ type: "cs:read-page" });
}

/**
 * Relay a message to the active tab's content script (the DOM bridge) and
 * return its response. Throws for restricted schemes (chrome://, store,
 * extension pages) or when the content script can't be reached.
 */
async function relayToActiveTab<T>(message: object): Promise<T> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  const url = tab.url ?? "";
  if (/^(chrome|edge|about|chrome-extension):/i.test(url)) {
    throw new Error("This page can't be accessed by the extension.");
  }

  return (await browser.tabs.sendMessage(tab.id, message)) as T;
}
