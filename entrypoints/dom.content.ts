import { browser } from "wxt/browser";
import {
  buildSelector,
  deriveLabel,
  describeElement,
  extractImages,
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

    /** Parses DuckDuckGo HTML search results from the current page. */
    function extractSearchResults() {
      const results: Array<{
        title: string;
        url: string;
        snippet: string;
      }> = [];

      document
        .querySelectorAll(".result, .web-result")
        .forEach((el) => {
          const link = el.querySelector(
            ".result__a",
          ) as HTMLAnchorElement | null;
          if (!link) return;

          const title = (link.textContent || "").trim();
          if (!title) return;

          let url = link.href;
          try {
            const u = new URL(link.href);
            const uddg = u.searchParams.get("uddg");
            if (uddg) url = decodeURIComponent(uddg);
          } catch {
            // keep raw href
          }

          const snippet = (
            el.querySelector(".result__snippet")?.textContent || ""
          ).trim();

          results.push({ title, url, snippet });
        });

      return { results };
    }

    /** Briefly flashes a green outline on an element (visual fill feedback). */
    function flashElement(el: Element) {
      const r = el.getBoundingClientRect();
      const flash = document.createElement("div");
      flash.setAttribute("data-bg-agent-flash", "");
      flash.style.cssText =
        "position:fixed;pointer-events:none;z-index:2147483645;" +
        "border:2px solid #22c55e;background:rgba(34,197,94,0.25);" +
        "border-radius:3px;display:block;" +
        "left:" + r.left + "px;top:" + r.top + "px;" +
        "width:" + r.width + "px;height:" + r.height + "px;";
      document.documentElement.append(flash);
      setTimeout(() => flash.remove(), 600);
    }

    /** Collects all fillable form fields with labels and selectors. */
    function listFormFields() {
      const fields: Array<{
        selector: string;
        tagName: string;
        type: string;
        label: string;
        value: string;
        name?: string;
        required: boolean;
      }> = [];

      const elements = document.querySelectorAll(
        "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image']):not([type='file']), textarea, select",
      );

      elements.forEach((el) => {
        const input = el as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        fields.push({
          selector: buildSelector(el),
          tagName: el.nodeName.toLowerCase(),
          type: (input as HTMLInputElement).type || "",
          label: deriveLabel(el),
          value: input.value ?? "",
          name: input.name || undefined,
          required: input.required ?? false,
        });
      });

      return { ok: true as const, fields };
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
        if (type === "cs:read-element") {
          const selector = (message as { selector: string }).selector;
          const el = document.querySelector(selector);
          if (!el) {
            sendResponse({
              ok: false,
              error: "Element not found: " + selector,
            });
            return false;
          }
          sendResponse({ ok: true, context: describeElement(el) });
          return false;
        }
        if (type === "cs:click-element") {
          const selector = (message as { selector: string }).selector;
          const el = document.querySelector(selector) as HTMLElement | null;
          if (!el) {
            sendResponse({
              ok: false,
              error: "Element not found: " + selector,
            });
            return false;
          }
          el.click();
          sendResponse({ ok: true });
          return false;
        }
        if (type === "cs:scroll") {
          const msg = message as { direction?: string; selector?: string };
          if (msg.selector) {
            const el = document.querySelector(msg.selector);
            if (!el) {
              sendResponse({
                ok: false,
                error: "Element not found: " + msg.selector,
              });
              return false;
            }
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            sendResponse({ ok: true });
            return false;
          }
          const dy = msg.direction === "up" ? -800 : 800;
          window.scrollBy({ top: dy, behavior: "smooth" });
          sendResponse({ ok: true });
          return false;
        }
        if (type === "cs:extract-search-results") {
          sendResponse(extractSearchResults());
          return false;
        }
        if (type === "cs:list-fields") {
          sendResponse(listFormFields());
          return false;
        }
        if (type === "cs:fill-field") {
          const msg = message as { selector: string; value: string };
          const el = document.querySelector(msg.selector) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | null;
          if (!el) {
            sendResponse({
              ok: false,
              error: "Element not found: " + msg.selector,
            });
            return false;
          }

          const tagName = el.nodeName.toLowerCase();

          if (tagName === "select") {
            el.value = msg.value;
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (
            (el as HTMLInputElement).type === "checkbox" ||
            (el as HTMLInputElement).type === "radio"
          ) {
            (el as HTMLInputElement).checked =
              msg.value === "true" || msg.value === "on";
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            const proto =
              tagName === "textarea"
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(
              proto,
              "value",
            )?.set;
            if (setter) {
              setter.call(el, msg.value);
            } else {
              (el as HTMLInputElement).value = msg.value;
            }
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }

          flashElement(el);
          sendResponse({ ok: true });
          return false;
        }
        if (type === "cs:submit-form") {
          const selector = (message as { selector?: string }).selector;
          let target: Element | null = selector
            ? document.querySelector(selector)
            : null;

          if (!target) {
            target = document.querySelector(
              "button[type='submit'], input[type='submit']",
            ) ?? document.querySelector("form");
          }

          if (!target) {
            sendResponse({
              ok: false,
              error: "No form or submit button found.",
            });
            return false;
          }

          if (target instanceof HTMLFormElement) {
            const btn = target.querySelector(
              "button[type='submit'], input[type='submit']",
            );
            if (btn) {
              (btn as HTMLElement).click();
            } else if (target.requestSubmit) {
              target.requestSubmit();
            } else {
              target.submit();
            }
          } else {
            (target as HTMLElement).click();
          }

          sendResponse({ ok: true });
          return false;
        }
        if (type === "cs:list-links") {
          const currentHost = location.hostname;
          const links: Array<{
            text: string;
            href: string;
            internal: boolean;
          }> = [];

          document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
            const href = a.href;
            if (
              !href ||
              href.startsWith("javascript:") ||
              href.startsWith("#") ||
              href.startsWith("mailto:")
            )
              return;

            const text = (a.textContent || "").trim().slice(0, 200);
            if (!text) return;

            let internal = false;
            try {
              internal = new URL(href).hostname === currentHost;
            } catch {
              internal = true;
            }

            links.push({ text, href, internal });
          });

          const seen = new Set<string>();
          const unique = links.filter((l) => {
            if (seen.has(l.href)) return false;
            seen.add(l.href);
            return true;
          });

          sendResponse({ ok: true as const, links: unique });
          return false;
        }
        if (type === "cs:list-images") {
          sendResponse({ ok: true, images: extractImages() });
          return false;
        }
        if (type === "cs:page-structure") {
          const headings: Array<{
            level: number;
            text: string;
            id?: string;
          }> = [];

          document
            .querySelectorAll("h1, h2, h3, h4, h5, h6")
            .forEach((el) => {
              const text = (el.textContent || "").trim();
              if (!text) return;
              headings.push({
                level: parseInt(el.tagName[1]),
                text,
                id: el.id || undefined,
              });
            });

          sendResponse({ ok: true as const, headings });
          return false;
        }
        return false;
      },
    );
  },
});
