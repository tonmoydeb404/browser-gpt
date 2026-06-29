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

    // Web search via DuckDuckGo HTML in a background tab.
    if (type === "bg:web-search") {
      const query = (message as { query: string }).query;
      webSearchViaTab(query)
        .then((results) => sendResponse({ ok: true, results }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Fetch + read a page in a background tab.
    if (type === "bg:fetch-page") {
      const url = (message as { url: string }).url;
      queryViaTab<PageContent>(url, { type: "cs:read-page" })
        .then((content) => sendResponse({ ok: true, content }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Read a specific element on the active tab.
    if (type === "bg:read-element") {
      relayToActiveTab({
        type: "cs:read-element",
        selector: (message as { selector: string }).selector,
      })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Click an element on the active tab.
    if (type === "bg:click-element") {
      relayToActiveTab({
        type: "cs:click-element",
        selector: (message as { selector: string }).selector,
      })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Scroll the active tab.
    if (type === "bg:scroll") {
      relayToActiveTab({
        type: "cs:scroll",
        direction: (message as { direction?: string }).direction,
        selector: (message as { selector?: string }).selector,
      })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // List form fields on the active tab.
    if (type === "bg:list-fields") {
      relayToActiveTab({ type: "cs:list-fields" })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Fill a form field on the active tab.
    if (type === "bg:fill-field") {
      relayToActiveTab({
        type: "cs:fill-field",
        selector: (message as { selector: string }).selector,
        value: (message as { value: string }).value,
      })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Submit a form on the active tab.
    if (type === "bg:submit-form") {
      relayToActiveTab({
        type: "cs:submit-form",
        selector: (message as { selector?: string }).selector,
      })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // List links on the active tab.
    if (type === "bg:list-links") {
      relayToActiveTab({ type: "cs:list-links" })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // List images on the active tab.
    if (type === "bg:list-images") {
      relayToActiveTab({ type: "cs:list-images" })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Get the heading structure of the active tab.
    if (type === "bg:page-structure") {
      relayToActiveTab({ type: "cs:page-structure" })
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Navigate the active tab to a URL and return the loaded page content.
    if (type === "bg:navigate") {
      const url = (message as { url: string }).url;
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(async ([tab]) => {
          if (!tab?.id) throw new Error("No active tab.");
          const currentUrl = tab.url ?? "";
          await browser.tabs.update(tab.id, { url });
          await waitForTabLoaded(tab.id);
          await new Promise((r) => setTimeout(r, CS_READY_DELAY));
          const content = (await browser.tabs.sendMessage(tab.id, {
            type: "cs:read-page",
          })) as PageContent;
          sendResponse({
            ok: true,
            content,
            previousUrl: currentUrl,
          });
        })
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // List tabs in the current window.
    if (type === "bg:list-tabs") {
      browser.tabs
        .query({ currentWindow: true })
        .then((tabs) => {
          const filtered = tabs
            .filter(
              (t) =>
                t.id != null &&
                t.url &&
                !t.url.startsWith("chrome://") &&
                !t.url.startsWith("chrome-extension://"),
            )
            .map((t) => ({
              id: t.id!,
              title: t.title ?? "",
              url: t.url!,
            }));
          sendResponse({ ok: true, tabs: filtered });
        })
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // Group tabs into named, colored tab groups.
    if (type === "bg:group-tabs") {
      const groups = (message as {
        groups: Array<{
          tabIds: number[];
          title: string;
          color: string;
        }>;
      }).groups;
      applyTabGroups(groups)
        .then(() => sendResponse({ ok: true }))
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

const TAB_LOAD_TIMEOUT = 15_000;
const CS_READY_DELAY = 300;

/** Wait for a tab to finish loading. Rejects after timeout. */
function waitForTabLoaded(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timed out."));
    }, TAB_LOAD_TIMEOUT);

    const listener = (
      id: number,
      info: { status?: string },
    ) => {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timeout);
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    browser.tabs.onUpdated.addListener(listener);

    browser.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        clearTimeout(timeout);
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

/**
 * Open a URL in a background tab, wait for it to load, send a message to
 * its content script, then close the tab. Used by web_search and fetch_page.
 */
async function queryViaTab<T>(
  url: string,
  message: object,
): Promise<T> {
  const tab = await browser.tabs.create({ url, active: false });
  try {
    await waitForTabLoaded(tab.id!);
    await new Promise((r) => setTimeout(r, CS_READY_DELAY));
    return (await browser.tabs.sendMessage(tab.id!, message)) as T;
  } finally {
    await browser.tabs.remove(tab.id!).catch(() => {});
  }
}

/** Search DuckDuckGo HTML and extract structured results. */
async function webSearchViaTab(
  query: string,
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const searchUrl =
    "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
  const response = await queryViaTab<{ results: Array<{ title: string; url: string; snippet: string }> }>(
    searchUrl,
    { type: "cs:extract-search-results" },
  );
  return response.results;
}

/** Creates Chrome tab groups from a grouping plan. */
async function applyTabGroups(
  groups: Array<{
    tabIds: number[];
    title: string;
    color: string;
  }>,
): Promise<void> {
  for (const group of groups) {
    const groupId = (await browser.tabs.group({
      tabIds: group.tabIds as [number, ...number[]],
    })) as number;
    await browser.tabGroups.update(groupId, {
      title: group.title,
      color: group.color as never,
    });
  }
}
