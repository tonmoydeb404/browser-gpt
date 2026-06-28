import { browser } from "wxt/browser";
import { extractPageState } from "@/lib/browser/page-state";
import {
  performPageAction,
  type ActionRequest,
} from "@/lib/browser/page-actions";

export default defineBackground(() => {
  // Open the side panel when the toolbar action icon is clicked.
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err: unknown) =>
      console.error("Failed to set side panel behavior:", err),
    );

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (typeof message !== "object" || message === null) {
      return false;
    }

    const type = (message as { type?: string }).type;

    // ---- existing: read full page content for RAG/chat ----
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

    // ---- new: get interactive element list for agent mode ----
    if (type === "bg:get-page-state") {
      getActiveTabState()
        .then((state) => sendResponse({ ok: true, state }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // ---- new: perform a DOM action (click, type, scroll, etc.) ----
    if (type === "bg:perform-action") {
      const { action } = message as { action: ActionRequest };
      performActiveTabAction(action)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // ---- new: navigation (navigate, back, forward, reload) ----
    if (type === "bg:navigate") {
      const { action: navAction, url: navUrl } = message as {
        action: string;
        url?: string;
      };
      handleNavigate(navAction, navUrl)
        .then((res) => sendResponse(res))
        .catch((err: unknown) =>
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      return true;
    }

    // ---- new: tab management (list, open, close, switch) ----
    if (type === "bg:tab-manage") {
      const { action: tabAction, url: tabUrl, tabId, active } = message as {
        action: string;
        url?: string;
        tabId?: number;
        active?: boolean;
      };
      handleTabManage(tabAction, tabUrl, tabId, active)
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

async function readActiveTab(): Promise<{
  url: string;
  title: string;
  text: string;
  markdown: string;
  meta: Record<string, string>;
}> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  const url = tab.url ?? "";
  // Restricted URLs (chrome://, edge://, the web store) cannot be scripted.
  if (/^(chrome|edge|about|chrome-extension):/i.test(url)) {
    return { url, title: tab.title ?? "", text: "", markdown: "", meta: {} };
  }

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPageContent,
  });

  const result = results?.[0]?.result as
    | {
        url: string;
        title: string;
        text: string;
        markdown: string;
        meta: Record<string, string>;
      }
    | undefined;

  return result ?? { url, title: tab.title ?? "", text: "", markdown: "", meta: {} };
}

/**
 * Get the active tab's interactive element list for agent mode.
 */
async function getActiveTabState() {
  const tabId = await getActiveTabId();
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: extractPageState,
  });
  return results?.[0]?.result;
}

/**
 * Perform a DOM action (click, type, scroll, etc.) on the active tab.
 */
async function performActiveTabAction(action: ActionRequest) {
  const tabId = await getActiveTabId();
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: performPageAction,
    args: [
      action.action,
      action.index,
      action.text,
      action.key,
      action.direction,
      action.value,
    ],
  });
  return results?.[0]?.result as
    | { success: boolean; message: string }
    | undefined;
}

/** Shared helper: resolve active tab ID, guarding restricted schemes. */
async function getActiveTabId(): Promise<number> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found.");
  const url = tab.url ?? "";
  if (/^(chrome|edge|about|chrome-extension):/i.test(url)) {
    throw new Error("Cannot interact with restricted browser pages.");
  }
  return tab.id;
}

/**
 * Wait for a tab to finish loading (status "complete").
 * Resolves after at most 10 seconds regardless.
 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    const listener = (
      updatedTabId: number,
      info: { status?: string },
    ) => {
      if (updatedTabId === tabId && info.status === "complete") finish();
    };
    browser.tabs.onUpdated.addListener(listener);
    setTimeout(finish, 10_000);
  });
}

/**
 * Handle navigation actions: navigate, back, forward, reload.
 * Waits for the page to load before returning (up to 10s timeout).
 */
async function handleNavigate(
  action: string,
  url?: string,
): Promise<{ ok: boolean; url?: string; title?: string; error?: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab found." };

  try {
    switch (action) {
      case "navigate": {
        if (!url) return { ok: false, error: "No URL provided." };
        await browser.tabs.update(tab.id, { url });
        await waitForTabLoad(tab.id);
        break;
      }
      case "back":
        await browser.tabs.goBack(tab.id);
        await waitForTabLoad(tab.id);
        break;
      case "forward":
        await browser.tabs.goForward(tab.id);
        await waitForTabLoad(tab.id);
        break;
      case "reload":
        await browser.tabs.reload(tab.id);
        await waitForTabLoad(tab.id);
        break;
      default:
        return { ok: false, error: `Unknown navigation action: ${action}` };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Read updated tab info
  const updated = await browser.tabs.get(tab.id);
  return {
    ok: true,
    url: updated.url ?? "",
    title: updated.title ?? "",
  };
}

/**
 * Handle tab management: list, open, close, switch.
 */
async function handleTabManage(
  action: string,
  url?: string,
  tabId?: number,
  active?: boolean,
): Promise<{
  ok: boolean;
  tabs?: { id: number; title: string; url: string; active: boolean }[];
  tabId?: number;
  error?: string;
}> {
  switch (action) {
    case "list": {
      const tabs = await browser.tabs.query({});
      return {
        ok: true,
        tabs: tabs.map((t) => ({
          id: t.id ?? 0,
          title: t.title ?? "",
          url: t.url ?? "",
          active: t.active ?? false,
        })),
      };
    }
    case "open": {
      const newTab = await browser.tabs.create({
        url: url || undefined,
        active: active ?? true,
      });
      if (url) await waitForTabLoad(newTab.id ?? 0);
      return { ok: true, tabId: newTab.id };
    }
    case "close": {
      const targetId = tabId ?? (await getActiveTabId());
      await browser.tabs.remove(targetId);
      return { ok: true };
    }
    case "switch": {
      if (!tabId) return { ok: false, error: "No tab ID provided." };
      await browser.tabs.update(tabId, { active: true });
      return { ok: true, tabId };
    }
    default:
      return { ok: false, error: `Unknown tab action: ${action}` };
  }
}

// Injected into the page context. Must be self-contained (no closure vars).
function extractPageContent() {
  const meta: Record<string, string> = {};
  document
    .querySelectorAll("meta[name], meta[property]")
    .forEach((el) => {
      const key = el.getAttribute("name") || el.getAttribute("property");
      const value = el.getAttribute("content");
      if (key && value) meta[key] = value;
    });

  const walk = (node: Node): string => {
    const el = node as Element;
    const name = el.nodeName?.toLowerCase();

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    if (
      name === "script" ||
      name === "style" ||
      name === "noscript" ||
      name === "svg" ||
      name === "template" ||
      el.getClientRects?.().length === 0
    ) {
      return "";
    }

    let out = "";
    let child = node.firstChild;
    while (child) {
      out += walk(child);
      child = child.nextSibling;
    }

    switch (name) {
      case "h1":
        return `\n\n# ${out.trim()}\n\n`;
      case "h2":
        return `\n\n## ${out.trim()}\n\n`;
      case "h3":
        return `\n\n### ${out.trim()}\n\n`;
      case "h4":
        return `\n\n#### ${out.trim()}\n\n`;
      case "li":
        return `- ${out.trim()}\n`;
      case "p":
      case "div":
      case "section":
      case "article":
      case "header":
      case "footer":
      case "main":
        return out.trim() ? `\n${out.trim()}\n` : "";
      case "a": {
        const href = el.getAttribute("href");
        return href ? `[${out.trim()}](${href})` : out;
      }
      case "code": {
        const pre = el.closest("pre");
        return pre ? `\n\`\`\`\n${el.textContent ?? ""}\n\`\`\`\n` : `\`${out.trim()}\``;
      }
      case "blockquote":
        return out
          .trim()
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
      case "br":
        return "\n";
      default:
        return out;
    }
  };

  const markdown = walk(document.body).replace(/\n{3,}/g, "\n\n").trim();

  return {
    url: location.href,
    title: document.title,
    text: document.body.innerText,
    markdown,
    meta,
  };
}
