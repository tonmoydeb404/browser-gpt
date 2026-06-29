import { browser } from "wxt/browser";

import type { PageContent } from "./dom-utils";
export type { PageContent };

export const EMPTY_CONTENT: PageContent = {
  url: "",
  title: "",
  text: "",
  markdown: "",
  meta: {},
};

interface ReadTabResponse {
  ok: boolean;
  content?: PageContent;
  error?: string;
}

/**
 * Ask the background service worker to read + extract the active tab's content.
 * Returns EMPTY_CONTENT for restricted pages (chrome://, extension pages, etc.).
 */
export async function readActiveTabContent(): Promise<PageContent> {
  try {
    const response = (await browser.runtime.sendMessage({
      type: "bg:read-active-tab",
    })) as ReadTabResponse;

    if (!response?.ok || !response.content) {
      console.warn("[browser-gpt] readActiveTabContent failed:", response?.error);
      return EMPTY_CONTENT;
    }

    return response.content;
  } catch (err) {
    console.warn("[browser-gpt] readActiveTabContent failed:", err);
    return EMPTY_CONTENT;
  }
}

export function isContentAvailable(content: PageContent): boolean {
  return content.text.trim().length > 0 || content.markdown.trim().length > 0;
}

interface SimpleResponse {
  ok: boolean;
  error?: string;
}

/**
 * Ask the background service worker to inject the element picker into the
 * active tab. Returns `ok: false` for restricted pages (chrome://, store, …).
 */
export async function startDomPickerOnActiveTab(): Promise<SimpleResponse> {
  try {
    const response = (await browser.runtime.sendMessage({
      type: "bg:start-dom-picker",
    })) as SimpleResponse | undefined;
    return response ?? { ok: false, error: "No response from background." };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Ask the background to stop the active picker (ends multi-select session). */
export async function stopDomPickerOnActiveTab(): Promise<SimpleResponse> {
  try {
    const response = (await browser.runtime.sendMessage({
      type: "bg:stop-dom-picker",
    })) as SimpleResponse | undefined;
    return response ?? { ok: true };
  } catch {
    return { ok: true };
  }
}
