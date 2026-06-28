import { browser } from "wxt/browser";

export interface PageContent {
  url: string;
  title: string;
  text: string;
  markdown: string;
  meta: Record<string, string>;
}

export interface ReadTabResult {
  ok: boolean;
  content?: PageContent;
  error?: string;
}

const EMPTY_CONTENT: PageContent = {
  url: "",
  title: "",
  text: "",
  markdown: "",
  meta: {},
};

/**
 * Ask the background service worker to read + extract the active tab's content.
 * Returns EMPTY_CONTENT for restricted pages (chrome://, extension pages, etc.).
 */
export async function readActiveTabContent(): Promise<PageContent> {
  const response = (await browser.runtime.sendMessage({
    type: "bg:read-active-tab",
  })) as ReadTabResult;

  if (!response?.ok || !response.content) {
    console.warn("[browser-gpt] readActiveTabContent failed:", response?.error);
    return EMPTY_CONTENT;
  }

  return response.content;
}

export function isContentAvailable(content: PageContent): boolean {
  return content.text.trim().length > 0 || content.markdown.trim().length > 0;
}

export function buildContextMessage(content: PageContent): string {
  const parts: string[] = [
    "You are a helpful assistant embedded in a browser sidebar. The user is currently viewing the page below. Answer their questions using this page as the primary context. If the answer is not on the page, say so.",
    "",
    `# Current page`,
    `URL: ${content.url}`,
    `Title: ${content.title}`,
  ];

  const description = content.meta["description"] ?? content.meta["og:description"];
  if (description) parts.push(`Description: ${description}`);

  const body = content.markdown.trim() || content.text.trim();
  const MAX_CHARS = 24_000;
  const truncated =
    body.length > MAX_CHARS
      ? `${body.slice(0, MAX_CHARS)}\n\n[...page truncated, ${body.length - MAX_CHARS} more characters...]`
      : body;

  parts.push("", "## Page content", truncated);

  return parts.join("\n");
}
