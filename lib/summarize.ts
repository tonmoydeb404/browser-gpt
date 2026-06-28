import { generateText } from "ai";
import { createModel } from "../contexts/config/hooks/openrouter";
import type { PageContent } from "./tab-extractor";

const SUMMARY_SYSTEM =
  "You generate concise, faithful reference summaries of web pages for a browser assistant. " +
  "Capture the page's main topic, key sections, and any notable facts, entities, or data. " +
  "Use structured Markdown (headings + bullets). Do not add information that is not on the page. " +
  "Keep it under ~400 words.";

const MAX_SUMMARY_CHARS = 16_000;

/**
 * Generate a concise summary of a page to use as base chat context.
 * Falls back to a truncated body when no API key / model is available.
 */
export async function summarizePage(
  content: PageContent,
  apiKey: string,
  modelId: string,
): Promise<string> {
  const body = (content.markdown.trim() || content.text.trim()).slice(
    0,
    MAX_SUMMARY_CHARS,
  );

  if (!body) return "";

  if (!apiKey) return body;

  const { text } = await generateText({
    model: createModel(apiKey, modelId),
    system: SUMMARY_SYSTEM,
    prompt: `Title: ${content.title}\nURL: ${content.url}\n\n${body}`,
  });

  return text.trim() || body;
}
