import { browser } from "wxt/browser";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ToolContext } from "../types";

interface ElementInfo {
  selector: string;
  tagName: string;
  role?: string;
  label: string;
  text: string;
  markdown: string;
  href?: string;
}

interface ReadElementResponse {
  ok: boolean;
  context?: ElementInfo;
  error?: string;
}

interface SimpleResponse {
  ok: boolean;
  error?: string;
}

export function createPageActionTools(ctx: ToolContext): ToolSet {
  return {
    read_element: tool({
      description:
        "Read the content of a specific element on the current page by CSS " +
        "selector. Returns the element's text, label, tag name, role, and " +
        "a stable selector you can use for follow-up actions like clicking.",
      inputSchema: z.object({
        selector: z
          .string()
          .describe("CSS selector for the element to read (e.g. 'h1', 'nav', 'button.submit')."),
      }),
      execute: async ({ selector }) => {
        ctx.emitStep({
          label: `Reading: ${selector}`,
          status: "running",
        });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:read-element",
            selector,
          })) as ReadElementResponse;

          if (!response.ok || !response.context) {
            ctx.emitStep({
              label: `Reading: ${selector}`,
              status: "error",
              detail: response.error,
            });
            return `Element not found: ${response.error ?? "unknown error"}`;
          }

          const c = response.context;
          ctx.emitStep({
            label: `Read: ${c.label || c.tagName}`,
            status: "done",
          });

          const meta = [`tag: ${c.tagName}`];
          if (c.role) meta.push(`role: ${c.role}`);
          if (c.href) meta.push(`href: ${c.href}`);
          const body = (c.markdown.trim() || c.text.trim()).slice(0, 4000);

          return (
            `Found element. Use selector "${c.selector}" for follow-up actions.\n` +
            `[${meta.join(", ")}], label: "${c.label}"\n\n${body}`
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: `Reading: ${selector}`,
            status: "error",
            detail: msg,
          });
          return `Error: ${msg}`;
        }
      },
    }),

    click_element: tool({
      description:
        "Click an element on the current page. Requires user confirmation " +
        "before clicking — always provide a clear reason. Use read_element " +
        "first to find the right selector.",
      inputSchema: z.object({
        selector: z
          .string()
          .describe("CSS selector for the element to click."),
        reason: z
          .string()
          .describe("Why you want to click this element."),
      }),
      execute: async ({ selector, reason }) => {
        const approved = await ctx.confirm({
          id: `click-${Date.now()}`,
          action: "Click element",
          description: `${reason}\nSelector: ${selector}`,
        });

        if (!approved) {
          return "User declined to click this element.";
        }

        ctx.emitStep({
          label: `Clicking: ${selector}`,
          status: "running",
        });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:click-element",
            selector,
          })) as SimpleResponse;

          if (!response.ok) {
            ctx.emitStep({
              label: `Clicking: ${selector}`,
              status: "error",
              detail: response.error,
            });
            return `Click failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: `Clicked: ${selector}`,
            status: "done",
          });
          return "Element clicked successfully.";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: `Clicking: ${selector}`,
            status: "error",
            detail: msg,
          });
          return `Click error: ${msg}`;
        }
      },
    }),

    scroll_page: tool({
      description:
        "Scroll the current page. Can scroll up or down by one viewport, " +
        "or scroll to a specific element by CSS selector.",
      inputSchema: z.object({
        direction: z
          .enum(["up", "down"])
          .optional()
          .describe("Direction to scroll (ignored if selector is given)."),
        selector: z
          .string()
          .optional()
          .describe("CSS selector to scroll into view. Takes priority over direction."),
      }),
      execute: async ({ direction, selector }) => {
        const label = selector
          ? `Scroll to: ${selector}`
          : `Scroll ${direction ?? "down"}`;

        ctx.emitStep({ label, status: "running" });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:scroll",
            direction,
            selector,
          })) as SimpleResponse;

          if (!response.ok) {
            ctx.emitStep({
              label,
              status: "error",
              detail: response.error,
            });
            return `Scroll failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({ label, status: "done" });
          return "Scrolled successfully.";
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({ label, status: "error", detail: msg });
          return `Scroll error: ${msg}`;
        }
      },
    }),
  };
}
