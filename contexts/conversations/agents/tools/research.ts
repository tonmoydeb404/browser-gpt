import { browser } from "wxt/browser";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ToolContext } from "../types";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface SearchResponse {
  ok: boolean;
  results?: SearchResult[];
  error?: string;
}

interface PageContentLike {
  url: string;
  title: string;
  text: string;
  markdown: string;
  meta: Record<string, string>;
}

interface FetchPageResponse {
  ok: boolean;
  content?: PageContentLike;
  error?: string;
}

export function createResearchTools(ctx: ToolContext): ToolSet {
  return {
    web_search: tool({
      description:
        "Search the web for information. Returns a list of results with " +
        "titles, URLs, and snippets. Use this to find relevant pages before " +
        "reading them with fetch_page.",
      inputSchema: z.object({
        query: z.string().describe("The search query."),
      }),
      execute: async ({ query }) => {
        ctx.emitStep({ label: `Searching: ${query}`, status: "running" });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:web-search",
            query,
          })) as SearchResponse;

          if (!response.ok || !response.results) {
            ctx.emitStep({
              label: `Searching: ${query}`,
              status: "error",
              detail: response.error,
            });
            return `Search failed: ${response.error ?? "unknown error"}`;
          }

          if (response.results.length === 0) {
            ctx.emitStep({
              label: `Searching: ${query}`,
              status: "done",
              detail: "no results",
            });
            return "No results found for this query.";
          }

          ctx.emitSources(
            response.results.slice(0, 8).map((r) => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
            })),
          );

          ctx.emitStep({
            label: `Searching: ${query}`,
            status: "done",
            detail: `${response.results.length} results`,
          });

          return response.results
            .map(
              (r, i) =>
                `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`,
            )
            .join("\n\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: `Searching: ${query}`,
            status: "error",
            detail: msg,
          });
          return `Search error: ${msg}`;
        }
      },
    }),

    fetch_page: tool({
      description:
        "Fetch and read the full content of a web page by URL. Returns the " +
        "page title and text content (up to ~8000 characters). Use this " +
        "after web_search to read specific pages.",
      inputSchema: z.object({
        url: z.string().describe("The URL of the page to read."),
      }),
      execute: async ({ url }) => {
        ctx.emitStep({ label: `Reading page`, status: "running", detail: url });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:fetch-page",
            url,
          })) as FetchPageResponse;

          if (!response.ok || !response.content) {
            ctx.emitStep({
              label: `Reading page`,
              status: "error",
              detail: response.error,
            });
            return `Failed to read page: ${response.error ?? "unknown error"}`;
          }

          const body = (
            response.content.markdown.trim() || response.content.text.trim()
          ).slice(0, 8000);

          ctx.emitStep({
            label: `Read: ${response.content.title}`,
            status: "done",
          });

          return `Title: ${response.content.title}\nURL: ${response.content.url}\n\n${body}`;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: `Reading page`,
            status: "error",
            detail: msg,
          });
          return `Fetch error: ${msg}`;
        }
      },
    }),
  };
}
