import { browser } from "wxt/browser";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ToolContext } from "../types";

interface LinkItem {
  text: string;
  href: string;
  internal: boolean;
}

interface HeadingItem {
  level: number;
  text: string;
  id?: string;
}

interface ListLinksResponse {
  ok: boolean;
  links?: LinkItem[];
  error?: string;
}

interface PageStructureResponse {
  ok: boolean;
  headings?: HeadingItem[];
  error?: string;
}

interface PageContentResponse {
  ok: boolean;
  content?: {
    url: string;
    title: string;
    text: string;
  };
  error?: string;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createExploreTools(ctx: ToolContext): ToolSet {
  return {
    list_links: tool({
      description:
        "List all clickable links on the current page. Returns link text, " +
        "href, and whether each link is internal (same domain) or external.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep({ label: "Listing links", status: "running" });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:list-links",
          })) as ListLinksResponse;

          if (!response.ok || !response.links) {
            ctx.emitStep({
              label: "Listing links",
              status: "error",
              detail: response.error,
            });
            return `Failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: "Listing links",
            status: "done",
            detail: `${response.links.length} links`,
          });

          if (response.links.length === 0) {
            return "No links found on this page.";
          }

          return response.links
            .map(
              (l, i) =>
                `${i + 1}. [${l.internal ? "internal" : "external"}] ${l.text}\n   ${l.href}`,
            )
            .join("\n\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({ label: "Listing links", status: "error", detail: msg });
          return `Error: ${msg}`;
        }
      },
    }),

    navigate_to: tool({
      description:
        "Navigate the active tab to a URL, wait for it to load, and return " +
        "the page content. Updates the sitemap visualization with the new " +
        "page as a node and an edge from the current page.",
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe("The absolute URL to navigate to."),
      }),
      execute: async ({ url }) => {
        ctx.emitStep({ label: "Navigating", status: "running", detail: url });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:navigate",
            url,
          })) as PageContentResponse;

          if (!response.ok || !response.content) {
            ctx.emitStep({
              label: "Navigating",
              status: "error",
              detail: response.error,
            });
            return `Failed: ${response.error ?? "unknown error"}`;
          }

          const { content } = response;
          const nodeId = slug(content.title || content.url);

          ctx.emitSitemap({
            nodes: [{ id: nodeId, url: content.url, title: content.title }],
            edges: [],
          });

          ctx.emitStep({
            label: "Navigating",
            status: "done",
            detail: content.title,
          });

          return (
            `Page: ${content.title}\nURL: ${content.url}\n\n` +
            (content.text || "(empty page)")
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({ label: "Navigating", status: "error", detail: msg });
          return `Error: ${msg}`;
        }
      },
    }),

    get_page_structure: tool({
      description:
        "Return the heading outline (h1–h6) of the current page. Useful " +
        "for understanding a page's content hierarchy.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep({
          label: "Reading page structure",
          status: "running",
        });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:page-structure",
          })) as PageStructureResponse;

          if (!response.ok || !response.headings) {
            ctx.emitStep({
              label: "Reading page structure",
              status: "error",
              detail: response.error,
            });
            return `Failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: "Reading page structure",
            status: "done",
            detail: `${response.headings.length} headings`,
          });

          if (response.headings.length === 0) {
            return "No headings found on this page.";
          }

          return response.headings
            .map((h) => `${"  ".repeat(h.level - 1)}h${h.level}: ${h.text}`)
            .join("\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: "Reading page structure",
            status: "error",
            detail: msg,
          });
          return `Error: ${msg}`;
        }
      },
    }),
  };
}
