import { browser } from "wxt/browser";
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { ToolContext } from "../types";

interface TabInfo {
  id: number;
  title: string;
  url: string;
}

interface ListTabsResponse {
  ok: boolean;
  tabs?: TabInfo[];
  error?: string;
}

interface SimpleResponse {
  ok: boolean;
  error?: string;
}

const TAB_COLORS = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
] as const;

export function createTabTools(ctx: ToolContext): ToolSet {
  return {
    list_tabs: tool({
      description:
        "List all open tabs in the current browser window. Returns each " +
        "tab's ID, title, and URL. Use this before grouping tabs.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.emitStep({ label: "Listing tabs", status: "running" });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:list-tabs",
          })) as ListTabsResponse;

          if (!response.ok || !response.tabs) {
            ctx.emitStep({
              label: "Listing tabs",
              status: "error",
              detail: response.error,
            });
            return `Failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: "Listing tabs",
            status: "done",
            detail: `${response.tabs.length} tabs`,
          });

          return response.tabs
            .map(
              (t, i) =>
                `${i + 1}. [ID:${t.id}] ${t.title}\n   ${t.url}`,
            )
            .join("\n\n");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: "Listing tabs",
            status: "error",
            detail: msg,
          });
          return `Error: ${msg}`;
        }
      },
    }),

    group_tabs: tool({
      description:
        "Group browser tabs into named, colored tab groups. " +
        "Each group specifies tab IDs (from list_tabs), a " +
        "title, and a color.",
      inputSchema: z.object({
        groups: z
          .array(
            z.object({
              tabIds: z
                .array(z.number())
                .describe("Tab IDs to include in this group."),
              title: z.string().describe("Label for the tab group."),
              color: z
                .enum(TAB_COLORS)
                .describe("Color for the tab group."),
            }),
          )
          .describe("The tab groupings to create."),
      }),
      execute: async ({ groups }) => {
        ctx.emitStep({ label: "Grouping tabs", status: "running" });

        try {
          const response = (await browser.runtime.sendMessage({
            type: "bg:group-tabs",
            groups,
          })) as SimpleResponse;

          if (!response.ok) {
            ctx.emitStep({
              label: "Grouping tabs",
              status: "error",
              detail: response.error,
            });
            return `Grouping failed: ${response.error ?? "unknown error"}`;
          }

          ctx.emitStep({
            label: "Grouped tabs",
            status: "done",
            detail: `${groups.length} groups`,
          });
          return `Created ${groups.length} tab groups successfully.`;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          ctx.emitStep({
            label: "Grouping tabs",
            status: "error",
            detail: msg,
          });
          return `Grouping error: ${msg}`;
        }
      },
    }),
  };
}
