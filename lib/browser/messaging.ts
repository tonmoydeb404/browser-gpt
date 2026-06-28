/**
 * Client-side helpers that send messages to the background service worker
 * to perform page-state extraction and DOM actions on the active tab.
 *
 * Uses the same sendMessage → sendResponse pattern as lib/tab-extractor.ts.
 */

import { browser } from "wxt/browser";
import type { BgPageStateResponse, PageState } from "./page-state";
import type { ActionRequest, BgActionResponse, ActionResult } from "./page-actions";

export async function getPageState(): Promise<PageState> {
  const res = (await browser.runtime.sendMessage({
    type: "bg:get-page-state",
  })) as BgPageStateResponse;

  if (!res.ok) throw new Error(res.error || "Failed to get page state");
  return res.state!;
}

export async function performAction(req: ActionRequest): Promise<ActionResult> {
  const res = (await browser.runtime.sendMessage({
    type: "bg:perform-action",
    action: req,
  })) as BgActionResponse;

  if (!res.ok) throw new Error(res.error || "Failed to perform action");
  return res.result!;
}
