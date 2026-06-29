import { browser } from "wxt/browser";
import {
  describeElement,
  extractPageContent,
} from "@/contexts/conversations/dom-utils";

/**
 * Persistent DOM bridge content script. Present on all pages by default so the
 * element picker (and future agent DOM tools) are always available without
 * on-demand injection.
 *
 * Message contract:
 *  - inbound (via tabs.sendMessage): `cs:start-picker` / `cs:stop-picker` /
 *    `cs:read-page`
 *  - outbound (via runtime.sendMessage): `cs:dom-picked` / `cs:picker-cancelled`
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    let active = false;
    let highlight: HTMLDivElement | null = null;
    let hint: HTMLDivElement | null = null;
    let flash: HTMLDivElement | null = null;

    const HIGHLIGHT_STYLE =
      "position:fixed;pointer-events:none;z-index:2147483646;" +
      "border:2px solid #6366f1;background:rgba(99,102,241,0.12);" +
      "border-radius:3px;transition:all 60ms ease;display:none;";
    const FLASH_STYLE =
      "position:fixed;pointer-events:none;z-index:2147483645;" +
      "border:2px solid #22c55e;background:rgba(34,197,94,0.25);" +
      "border-radius:3px;display:none;";
    const HINT_STYLE =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;" +
      "background:#111827;color:#fff;font-size:12px;font-family:system-ui,sans-serif;" +
      "padding:6px 12px;text-align:center;pointer-events:none;";

    const isOverlay = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return (
        target.hasAttribute("data-bg-picker-highlight") ||
        target.hasAttribute("data-bg-picker-hint") ||
        target.hasAttribute("data-bg-picker-flash")
      );
    };

    const place = (box: HTMLDivElement, r: DOMRect) => {
      box.style.left = r.left + "px";
      box.style.top = r.top + "px";
      box.style.width = r.width + "px";
      box.style.height = r.height + "px";
      box.style.display = "block";
    };

    const send = (message: object) => {
      browser.runtime.sendMessage(message).catch(() => {});
    };

    const onMove = (e: MouseEvent) => {
      if (isOverlay(e.target)) return;
      const t = e.target as Element | null;
      if (t && highlight) place(highlight, t.getBoundingClientRect());
    };

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const t = e.target as Element | null;
      if (!t || isOverlay(t) || !flash) return;

      const context = describeElement(t);
      place(flash, t.getBoundingClientRect());
      setTimeout(() => {
        if (flash) flash.style.display = "none";
      }, 450);
      send({ type: "cs:dom-picked", context });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopPicker();
        send({ type: "cs:picker-cancelled" });
      }
    };

    function startPicker() {
      if (active) return;
      active = true;

      highlight = document.createElement("div");
      highlight.setAttribute("data-bg-picker-highlight", "");
      highlight.style.cssText = HIGHLIGHT_STYLE;

      hint = document.createElement("div");
      hint.setAttribute("data-bg-picker-hint", "");
      hint.style.cssText = HINT_STYLE;
      hint.textContent = "Click an element to select \u00b7 Esc to finish";

      flash = document.createElement("div");
      flash.setAttribute("data-bg-picker-flash", "");
      flash.style.cssText = FLASH_STYLE;

      document.documentElement.append(highlight, hint, flash);

      document.addEventListener("mouseover", onMove, true);
      document.addEventListener("click", onClick, true);
      window.addEventListener("keydown", onKey, true);
    }

    function stopPicker() {
      if (!active) return;
      active = false;
      document.removeEventListener("mouseover", onMove, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      highlight?.remove();
      hint?.remove();
      flash?.remove();
      highlight = hint = flash = null;
    }

    browser.runtime.onMessage.addListener(
      (message, _sender, sendResponse) => {
        if (typeof message !== "object" || message === null) return false;
        const type = (message as { type?: string }).type;

        if (type === "cs:start-picker") {
          startPicker();
          sendResponse({ ok: true });
          return false;
        }
        if (type === "cs:stop-picker") {
          stopPicker();
          sendResponse({ ok: true });
          return false;
        }
        if (type === "cs:read-page") {
          sendResponse(extractPageContent());
          return false;
        }
        return false;
      },
    );
  },
});
