/**
 * AI SDK tool definitions for browser interaction.
 *
 * Each tool uses the index-based element reference system: `get_page_state`
 * assigns [N] markers to elements, and action tools reference them by that N.
 */

import { tool } from "ai";
import { z } from "zod";
import { getPageState } from "./messaging";
import { formatPageState } from "./page-state";
import { performAction } from "./messaging";
import {
  navigateTo,
  goBack,
  goForward,
  reloadPage,
  openTab,
  closeTab,
  switchTab,
  listTabs,
  formatTabList,
} from "./navigation";

export function createBrowserTools() {
  return {
    get_page_state: tool({
      description:
        "Get the current page's URL, title, scroll position, and a numbered list " +
        "of all interactive elements (buttons, links, inputs, selects, etc.). " +
        "Use this FIRST to understand what's on the page before taking actions. " +
        "Elements are referenced by their [index] number in subsequent action calls. " +
        "Call this again after actions that may change the page (navigation, clicks that open modals, form submission).",
      inputSchema: z.object({}),
      execute: async () => {
        const state = await getPageState();
        return formatPageState(state);
      },
    }),

    click_element: tool({
      description:
        "Click an interactive element on the page. Provide the element's index number " +
        "from the get_page_state list. Use for buttons, links, checkboxes, etc. " +
        "SAFETY: Before clicking submit/pay/delete buttons, tell the user what you're about to do.",
      inputSchema: z.object({
        index: z
          .number()
          .describe("The [index] of the element to click, from get_page_state"),
      }),
      execute: async ({ index }) => {
        const result = await performAction({ action: "click", index });
        return result.message;
      },
    }),

    type_text: tool({
      description:
        "Type text into an input field or textarea. Provide the element's index " +
        "and the text to type. The field is cleared before typing.",
      inputSchema: z.object({
        index: z
          .number()
          .describe("The [index] of the input/textarea element"),
        text: z.string().describe("The text to type into the field"),
      }),
      execute: async ({ index, text }) => {
        const result = await performAction({ action: "type", index, text });
        return result.message;
      },
    }),

    press_key: tool({
      description:
        "Simulate pressing a keyboard key. Optionally target a specific element by " +
        "index (otherwise uses the currently focused element). Common keys: Enter, " +
        "Tab, Escape, Backspace, ArrowDown, ArrowUp, ArrowLeft, ArrowRight. " +
        "Pressing Enter on a form input will submit the form.",
      inputSchema: z.object({
        key: z
          .string()
          .describe("The key to press, e.g. 'Enter', 'Tab', 'Escape', 'ArrowDown'"),
        index: z
          .number()
          .optional()
          .describe("The [index] of the element to press the key on. If omitted, uses focused element."),
      }),
      execute: async ({ key, index }) => {
        const result = await performAction({
          action: "press_key",
          key,
          index,
        });
        return result.message;
      },
    }),

    scroll_page: tool({
      description:
        "Scroll the page up or down by approximately 500px. Use this to reveal " +
        "more interactive elements that are below the fold. After scrolling, call " +
        "get_page_state to see the newly visible elements.",
      inputSchema: z.object({
        direction: z
          .enum(["up", "down"])
          .describe("Scroll direction: 'up' or 'down'"),
      }),
      execute: async ({ direction }) => {
        const result = await performAction({ action: "scroll", direction });
        return result.message;
      },
    }),

    select_option: tool({
      description:
        "Select an option from a dropdown (<select>) element. Provide the element's " +
        "index and the option's value or visible text.",
      inputSchema: z.object({
        index: z
          .number()
          .describe("The [index] of the select element"),
        value: z
          .string()
          .describe("The option value or visible text to select"),
      }),
      execute: async ({ index, value }) => {
        const result = await performAction({
          action: "select_option",
          index,
          value,
        });
        return result.message;
      },
    }),

    hover_element: tool({
      description:
        "Hover over an element to trigger hover menus, tooltips, or dropdown panels. " +
        "Provide the element's index.",
      inputSchema: z.object({
        index: z
          .number()
          .describe("The [index] of the element to hover"),
      }),
      execute: async ({ index }) => {
        const result = await performAction({ action: "hover", index });
        return result.message;
      },
    }),

    navigate_to: tool({
      description:
        "Navigate the current tab to a new URL. This will leave the current page — " +
        "all element indices from get_page_state will be invalidated. " +
        "After navigation, call get_page_state to see the new page's elements. " +
        "SAFETY: Tell the user where you're navigating before calling this.",
      inputSchema: z.object({
        url: z.string().describe("The full URL to navigate to (e.g. 'https://example.com')"),
      }),
      execute: async ({ url }) => {
        const res = await navigateTo(url);
        if (!res.ok) return `Navigation failed: ${res.error}`;
        return `Navigated to "${res.title}" (${res.url}). Call get_page_state to see the new page.`;
      },
    }),

    go_back: tool({
      description:
        "Go back to the previous page in browser history. " +
        "Element indices will be invalidated — call get_page_state after.",
      inputSchema: z.object({}),
      execute: async () => {
        const res = await goBack();
        if (!res.ok) return `Cannot go back: ${res.error}`;
        return `Went back to "${res.title}" (${res.url}).`;
      },
    }),

    go_forward: tool({
      description:
        "Go forward to the next page in browser history. " +
        "Element indices will be invalidated — call get_page_state after.",
      inputSchema: z.object({}),
      execute: async () => {
        const res = await goForward();
        if (!res.ok) return `Cannot go forward: ${res.error}`;
        return `Went forward to "${res.title}" (${res.url}).`;
      },
    }),

    reload_page: tool({
      description:
        "Reload the current page. Useful after form submissions or when the page " +
        "appears stuck. Element indices will be invalidated.",
      inputSchema: z.object({}),
      execute: async () => {
        const res = await reloadPage();
        if (!res.ok) return `Reload failed: ${res.error}`;
        return `Reloaded "${res.title}" (${res.url}).`;
      },
    }),

    open_tab: tool({
      description:
        "Open a new browser tab. Optionally navigate it to a URL. The new tab " +
        "becomes active. Returns the new tab ID for use with switch_tab.",
      inputSchema: z.object({
        url: z
          .string()
          .optional()
          .describe("URL to open. If omitted, opens a blank tab."),
      }),
      execute: async ({ url }) => {
        const res = await openTab(url);
        if (!res.ok) return `Failed to open tab: ${res.error}`;
        return `Opened new tab (ID: ${res.tabId}). Use switch_tab to return to it later.`;
      },
    }),

    close_tab: tool({
      description:
        "Close a browser tab. If no tab ID is provided, closes the current tab. " +
        "SAFETY: Tell the user which tab you're closing before calling this.",
      inputSchema: z.object({
        tabId: z
          .number()
          .optional()
          .describe("The tab ID to close. If omitted, closes the current tab."),
      }),
      execute: async ({ tabId }) => {
        const res = await closeTab(tabId);
        if (!res.ok) return `Failed to close tab: ${res.error}`;
        return `Closed tab${tabId ? ` (ID: ${tabId})` : ""}.`;
      },
    }),

    list_tabs: tool({
      description:
        "List all open browser tabs with their IDs, titles, and URLs. " +
        "Use this to find a tab ID for switch_tab or close_tab. " +
        "The active tab is marked with *.",
      inputSchema: z.object({}),
      execute: async () => {
        const tabs = await listTabs();
        return formatTabList(tabs);
      },
    }),

    switch_tab: tool({
      description:
        "Switch to a different browser tab by its ID. Use list_tabs first to " +
        "find the tab ID. After switching, call get_page_state to see the new tab's elements.",
      inputSchema: z.object({
        tabId: z.number().describe("The tab ID to switch to (from list_tabs)"),
      }),
      execute: async ({ tabId }) => {
        const res = await switchTab(tabId);
        if (!res.ok) return `Failed to switch tab: ${res.error}`;
        return `Switched to tab ${tabId}. Call get_page_state to see its elements.`;
      },
    }),
  };
}
