/**
 * Navigation & tab management — messaging helpers + tool definitions.
 *
 * These tools use chrome.tabs API (not executeScript) for navigation,
 * tab creation, switching, and listing.
 */

import { browser } from "wxt/browser";

// ---- types ----

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

export interface BgNavigateResponse {
  ok: boolean;
  url?: string;
  title?: string;
  error?: string;
}

export interface BgTabManageResponse {
  ok: boolean;
  tabs?: TabInfo[];
  tabId?: number;
  error?: string;
}

// ---- messaging helpers ----

export async function navigateTo(url: string): Promise<BgNavigateResponse> {
  return browser.runtime.sendMessage({
    type: "bg:navigate",
    action: "navigate",
    url,
  });
}

export async function goBack(): Promise<BgNavigateResponse> {
  return browser.runtime.sendMessage({
    type: "bg:navigate",
    action: "back",
  });
}

export async function goForward(): Promise<BgNavigateResponse> {
  return browser.runtime.sendMessage({
    type: "bg:navigate",
    action: "forward",
  });
}

export async function reloadPage(): Promise<BgNavigateResponse> {
  return browser.runtime.sendMessage({
    type: "bg:navigate",
    action: "reload",
  });
}

export async function openTab(
  url?: string,
  active = true,
): Promise<BgTabManageResponse> {
  return browser.runtime.sendMessage({
    type: "bg:tab-manage",
    action: "open",
    url,
    active,
  });
}

export async function closeTab(tabId?: number): Promise<BgTabManageResponse> {
  return browser.runtime.sendMessage({
    type: "bg:tab-manage",
    action: "close",
    tabId,
  });
}

export async function switchTab(tabId: number): Promise<BgTabManageResponse> {
  return browser.runtime.sendMessage({
    type: "bg:tab-manage",
    action: "switch",
    tabId,
  });
}

export async function listTabs(): Promise<TabInfo[]> {
  const res = (await browser.runtime.sendMessage({
    type: "bg:tab-manage",
    action: "list",
  })) as BgTabManageResponse;
  if (!res.ok) throw new Error(res.error || "Failed to list tabs");
  return res.tabs ?? [];
}

// ---- formatting ----

export function formatTabList(tabs: TabInfo[]): string {
  const lines: string[] = [`TABS (${tabs.length}):`];
  for (const tab of tabs) {
    const marker = tab.active ? "*" : " ";
    const host = (() => {
      try {
        return new URL(tab.url).hostname.replace(/^www\./, "");
      } catch {
        return tab.url.slice(0, 40);
      }
    })();
    const title = tab.title.slice(0, 40);
    lines.push(`[${tab.id}] ${marker} "${title}" — ${host}`);
  }
  return lines.join("\n");
}
