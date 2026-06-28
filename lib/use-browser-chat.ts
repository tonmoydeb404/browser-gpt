import { useChat } from "@ai-sdk/react";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type ChatTransport,
  type ToolSet,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { createModel } from "../contexts/config/hooks/openrouter";
import { AGENT_SYSTEM_PROMPT, createBrowserTools } from "./browser";
import { ensurePageIndexed, type IndexStatus } from "./rag";
import { retrieveRelevant } from "./rag/retrieve";
import { isContentAvailable, readActiveTabContent } from "./tab-extractor";

const SYSTEM_PROMPT_BASE =
  "You are Browser GPT, a helpful assistant embedded in the user's browser sidebar. Be concise and accurate. Use Markdown for formatting.";

const MAX_TOOL_STEPS = 3;

type SendMessagesOptions = Parameters<
  ChatTransport<UIMessage>["sendMessages"]
>[0];

/**
 * Custom transport that streams directly from OpenRouter using the user's API key.
 *
 * For each page the user is viewing:
 *  1. Indexes it once (chunk + embed + summarize) and caches in IndexedDB.
 *  2. Injects the concise page summary as base context (token-efficient).
 *  3. Exposes a `search_page` tool the model can call to retrieve relevant
 *     passages via RAG when it needs details beyond the summary.
 */
class OpenRouterTransport implements ChatTransport<UIMessage> {
  constructor(
    private readonly settingsRef: { current: UseBrowserChatSettings },
    private readonly onIndexingStatus: (status: IndexStatus) => void,
  ) {}

  async sendMessages({
    messages,
    abortSignal,
  }: SendMessagesOptions): Promise<ReadableStream<UIMessageChunk>> {
    const { apiKey, model, autoAttach, agentMode, maxAgentSteps } =
      this.settingsRef.current;

    if (!model) {
      throw new Error("No model selected. Open settings to select a model.");
    }

    if (!apiKey) {
      throw new Error(
        "Missing OpenRouter API key. Open settings to add yours.",
      );
    }

    let system = SYSTEM_PROMPT_BASE;
    let tools: ToolSet = {};
    const maxSteps = agentMode ? maxAgentSteps : MAX_TOOL_STEPS;

    // Agent mode: register browser interaction tools
    if (agentMode) {
      system += AGENT_SYSTEM_PROMPT;
      tools = { ...createBrowserTools() };
    }

    // Page context (RAG summary or raw content)
    if (autoAttach) {
      const content = await readActiveTabContent();
      if (isContentAvailable(content)) {
        try {
          const pageIndex = await ensurePageIndexed(content, {
            apiKey,
            model,
            onStatus: (s) => this.onIndexingStatus(s),
          });

          if (pageIndex.summary) {
            system +=
              `\n\nThe user is viewing this page. Use this summary as primary context:\n\n` +
              `Title: ${pageIndex.title}\nURL: ${pageIndex.url}\n\n${pageIndex.summary}\n\n` +
              `If you need specific details not covered by the summary, call the search_page tool.` +
              (pageIndex.chunks.length === 0
                ? ""
                : ` ${pageIndex.chunks.length} indexed passages are available for retrieval.`);
          }

          if (pageIndex.chunks.length > 0) {
            const pageUrl = pageIndex.url;
            tools = {
              search_page: tool({
                description:
                  "Search the current page for passages relevant to a query. " +
                  "Use when the user asks about specific details not in the page summary.",
                inputSchema: z.object({
                  query: z
                    .string()
                    .describe(
                      "The search query to find relevant page passages.",
                    ),
                }),
                execute: async ({ query }) => {
                  const passages = await retrieveRelevant(query, pageUrl, 5);
                  if (passages.length === 0)
                    return "No relevant passages found on the page.";
                  return passages.join("\n\n---\n\n");
                },
              }),
            };
          }
        } catch {
          // Indexing failed (WASM/model error) — fall back to raw content.
          const body = (content.markdown.trim() || content.text.trim()).slice(
            0,
            16_000,
          );
          if (body) {
            system +=
              `\n\nThe user is viewing this page:\n\n` +
              `Title: ${content.title}\nURL: ${content.url}\n\n${body}`;
          }
        }
      }
    }

    const languageModel = createModel(apiKey, model);
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: languageModel,
      system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      abortSignal,
    });

    return toUIMessageStream({ stream: result.fullStream });
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null);
  }
}

export interface UseBrowserChatSettings {
  apiKey: string;
  model: string | null;
  autoAttach: boolean;
  agentMode: boolean;
  maxAgentSteps: number;
}

export interface UseBrowserChatOptions {
  id?: string;
  messages?: UIMessage[];
  onFinish?: (messages: UIMessage[]) => void;
}

export function useBrowserChat(
  settings: UseBrowserChatSettings,
  options: UseBrowserChatOptions = {},
) {
  const { id, messages: initialMessages, onFinish } = options;
  const settingsRef = useRef(settings);
  const onFinishRef = useRef(onFinish);
  const [indexingStatus, setIndexingStatus] = useState<IndexStatus>("idle");

  const transport = useMemo(
    () => new OpenRouterTransport(settingsRef, setIndexingStatus),
    [],
  );

  const chat = useChat({
    transport,
    id,
    messages: initialMessages,
    onFinish: ({ messages }) => onFinishRef.current?.(messages),
  });

  // Keep the refs in sync so the transport/callback always read current values.
  settingsRef.current = settings;
  onFinishRef.current = onFinish;

  return { ...chat, indexingStatus };
}
