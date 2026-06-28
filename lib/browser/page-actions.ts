/**
 * DOM action execution — injected into the active tab to perform the agent's
 * requested actions (click, type, scroll, press key, select option).
 *
 * All actions target elements by the index assigned by `extractPageState`.
 */

export type ActionType =
  | "click"
  | "type"
  | "press_key"
  | "scroll"
  | "select_option"
  | "hover";

export interface ActionRequest {
  action: ActionType;
  index?: number;
  text?: string;
  key?: string;
  direction?: "up" | "down";
  value?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface BgActionResponse {
  ok: boolean;
  result?: ActionResult;
  error?: string;
}

/**
 * Injected into the page context via chrome.scripting.executeScript.
 * MUST be self-contained — no closure variables, no external references.
 * Receives arguments via the `args` parameter of executeScript.
 */
export function performPageAction(
  action: string,
  index: number | undefined,
  text: string | undefined,
  key: string | undefined,
  direction: string | undefined,
  value: string | undefined,
): ActionResult {
  const findEl = (idx: number): HTMLElement | null => {
    return document.querySelector(`[data-bgpt-idx="${idx}"]`);
  };

  switch (action) {
    case "click": {
      if (index === undefined)
        return { success: false, message: "No element index provided." };
      const el = findEl(index);
      if (!el)
        return {
          success: false,
          message:
            `Element [${index}] not found. Call get_page_state to see current elements.`,
        };
      const tag = el.tagName.toLowerCase();
      const label =
        el.getAttribute("aria-label") ||
        el.textContent?.trim().slice(0, 50) ||
        tag;
      el.click();
      return { success: true, message: `Clicked [${index}] "${label}" (${tag})` };
    }

    case "type": {
      if (index === undefined)
        return { success: false, message: "No element index provided." };
      const el = findEl(index) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el)
        return {
          success: false,
          message:
            `Element [${index}] not found. Call get_page_state to see current elements.`,
        };
      el.focus();
      el.value = text || "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      const tag = el.tagName.toLowerCase();
      const preview = (text || "").slice(0, 40);
      return {
        success: true,
        message: `Typed "${preview}" into [${index}] (${tag})`,
      };
    }

    case "press_key": {
      const target =
        index !== undefined
          ? findEl(index)
          : (document.activeElement as HTMLElement | null);
      if (!target)
        return {
          success: false,
          message: "No element focused. Provide an index or focus an element first.",
        };

      const keyName = key || "Enter";
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: keyName, bubbles: true }),
      );
      target.dispatchEvent(
        new KeyboardEvent("keyup", { key: keyName, bubbles: true }),
      );

      // Enter on an input inside a form → submit
      if (keyName === "Enter" && target.tagName === "INPUT") {
        const form = target.closest("form");
        if (form) form.requestSubmit();
      }

      return { success: true, message: `Pressed ${keyName}` };
    }

    case "scroll": {
      const dir = direction || "down";
      const amount = dir === "down" ? 500 : -500;
      window.scrollBy({ top: amount, behavior: "smooth" });
      return {
        success: true,
        message: `Scrolled ${dir}. Now at ~${Math.round(window.scrollY)}px.`,
      };
    }

    case "select_option": {
      if (index === undefined)
        return { success: false, message: "No element index provided." };
      const el = findEl(index) as HTMLSelectElement | null;
      if (!el)
        return {
          success: false,
          message:
            `Element [${index}] not found. Call get_page_state to see current elements.`,
        };

      // Try matching by value first, then by text
      const targetValue = value || text || "";
      let matched = false;
      for (const opt of el.options) {
        if (opt.value === targetValue || opt.text.trim() === targetValue) {
          el.value = opt.value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        return {
          success: false,
          message: `Option "${targetValue}" not found. Available: ${Array.from(
            el.options,
          )
            .map((o) => `"${o.text.trim()}"`)
            .join(", ")}`,
        };
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        success: true,
        message: `Selected "${targetValue}" in [${index}]`,
      };
    }

    case "hover": {
      if (index === undefined)
        return { success: false, message: "No element index provided." };
      const el = findEl(index);
      if (!el)
        return {
          success: false,
          message:
            `Element [${index}] not found. Call get_page_state to see current elements.`,
        };
      el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      return { success: true, message: `Hovered [${index}]` };
    }

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}
