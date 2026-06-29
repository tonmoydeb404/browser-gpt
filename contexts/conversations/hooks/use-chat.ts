import { useChat } from "@ai-sdk/react";
import {
  convertToModelMessages,
  createUIMessageStream,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type ChatTransport,
  type ToolSet,
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamWriter,
} from "ai";
import { useCallback, useMemo, useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { createModel } from "@/contexts/config/hooks/openrouter";
import { ConfirmationBridge } from "../agents/confirm";
import { getProfile } from "../agents/registry";
import type {
  AgentProfileId,
  AgentStepData,
  AskRequest,
  ChatMode,
  ImageData,
  SitemapData,
  SourceCitation,
  ToolContext,
} from "../agents/types";
import { buildAgentTools } from "../agents/tools";
import { isContentAvailable, readActiveTabContent } from "../messaging";
import { ensurePageIndexed, getPageIndex, type RagStatusData } from "../rag";
import { retrieveRelevant } from "../rag/retrieve";

const SYSTEM_PROMPT_BASE =
  "You are Browser GPT, a helpful assistant embedded in the user's browser sidebar. " +
  "Be concise and accurate. Use Markdown for formatting.";

const MAX_TOOL_STEPS = 3;

type SendMessagesOptions = Parameters<
  ChatTransport<UIMessage>["sendMessages"]
>[0];

export interface ChatSettings {
  apiKey: string;
  model: string | null;
  autoAttach: boolean;
  supportsTools: boolean;
  mode: ChatMode;
}

/**
 * Writes a `data-rag-status` part into the assistant message stream.
 * A stable `id` ensures the SDK replaces (not appends) on subsequent writes,
 * so the message always has exactly one RAG status part.
 */
function writeRagStatus(
  writer: UIMessageStreamWriter<UIMessage>,
  data: RagStatusData,
) {
  writer.write({ type: "data-rag-status", id: "rag-status", data });
}

/**
 * Custom transport that streams directly from OpenRouter using the user's API key.
 *
 * For each page the user is viewing:
 *  1. Emits a `data-rag-status` part so the UI shows indexing progress.
 *  2. Indexes the page once (chunk + embed + summarize), cached in IndexedDB.
 *  3. Injects the concise page summary as base context (token-efficient).
 *  4. Exposes a `search_page` tool the model can call to retrieve relevant
 *     passages via RAG when it needs details beyond the summary.
 *
 * The `data-rag-status` parts are UI-only — the AI SDK strips them from model
 * input on later turns, so they never pollute the LLM context.
 */
class BrowserGptTransport implements ChatTransport<UIMessage> {
  constructor(
    private readonly settingsRef: { current: ChatSettings },
    private readonly agentProfileRef: { current: AgentProfileId },
    private readonly confirmBridge: ConfirmationBridge,
    private readonly onRagError: (message: string) => void,
  ) {}

  async sendMessages({
    messages,
    abortSignal,
  }: SendMessagesOptions): Promise<ReadableStream<UIMessageChunk>> {
    const { apiKey, model, autoAttach, supportsTools, mode } =
      this.settingsRef.current;

    if (!model) {
      throw new Error("No model selected. Open settings to select a model.");
    }

    if (!apiKey) {
      throw new Error(
        "Missing OpenRouter API key. Open settings to add yours.",
      );
    }

    return createUIMessageStream<UIMessage>({
      execute: async ({ writer }) => {
        let system = SYSTEM_PROMPT_BASE;
        let tools: ToolSet = {};
        let maxSteps = MAX_TOOL_STEPS;

        if (mode === "agent") {
          const profile = getProfile(this.agentProfileRef.current);
          system += profile.systemPrompt;
          maxSteps = profile.maxSteps;

          if (supportsTools) {
            const stepMap = new Map<string, AgentStepData>();
            const stepOrder: string[] = [];
            const allSources: SourceCitation[] = [];
            const sitemapNodes: SitemapData["nodes"] = [];
            const sitemapEdges: SitemapData["edges"] = [];
            const allImages: ImageData[] = [];

            const toolCtx: ToolContext = {
              confirm: (req) => this.confirmBridge.request(req, writer),
              ask: (req) => this.confirmBridge.ask(req, writer),
              emitStep: (step) => {
                if (!stepMap.has(step.label)) stepOrder.push(step.label);
                stepMap.set(step.label, step);
                writer.write({
                  type: "data-agent-steps",
                  id: "agent-steps",
                  data: { steps: stepOrder.map((k) => stepMap.get(k)!) },
                });
              },
              emitSources: (sources) => {
                for (const s of sources) {
                  if (!allSources.some((e) => e.url === s.url))
                    allSources.push(s);
                }
                writer.write({
                  type: "data-sources",
                  id: "sources",
                  data: { sources: allSources },
                });
              },
              emitSitemap: (data) => {
                for (const node of data.nodes) {
                  if (!sitemapNodes.some((n) => n.id === node.id)) {
                    sitemapNodes.push(node);
                  }
                }
                for (const edge of data.edges) {
                  if (
                    !sitemapEdges.some(
                      (e) => e.source === edge.source && e.target === edge.target,
                    )
                  ) {
                    sitemapEdges.push(edge);
                  }
                }
                writer.write({
                  type: "data-sitemap",
                  id: "sitemap",
                  data: { nodes: sitemapNodes, edges: sitemapEdges },
                });
              },
              emitImages: (images) => {
                for (const img of images) {
                  if (!allImages.some((i) => i.src === img.src)) {
                    allImages.push(img);
                  }
                }
                writer.write({
                  type: "data-images",
                  id: "images",
                  data: { images: allImages },
                });
              },
            };

            tools = buildAgentTools(profile.id, toolCtx);
          }
        }

        const skipPageContext =
          mode === "agent" &&
          getProfile(this.agentProfileRef.current).skipPageContext === true;

        if (autoAttach && !skipPageContext) {
          const content = await readActiveTabContent();

          if (!isContentAvailable(content)) {
            writeRagStatus(writer, {
              phase: "unavailable",
              title: content.title,
              url: content.url,
            });
          } else {
            // Annotate when indexing actually happens — not on cache hits.
            const cached = await getPageIndex(content.url);
            const isFresh = !cached;

            // Proactive image awareness: a compact count + alt coverage hint
            // so the model knows images exist and can call list_images for
            // sources/previews in any query.
            if (content.images.length > 0) {
              const withAlt = content.images.filter(
                (i) => i.alt && i.alt.trim(),
              ).length;
              system +=
                `\n\nImages on this page: ${content.images.length} ` +
                `(${withAlt} with descriptive alt text). ` +
                `Use the list_images tool to extract their sources and render a preview gallery.`;
            }

            if (isFresh) {
              writeRagStatus(writer, {
                phase: "indexing",
                title: content.title,
                url: content.url,
              });
            }

            try {
              const pageIndex = await ensurePageIndexed(content, {
                apiKey,
                model,
              });

              if (pageIndex.summary) {
                const toolHint = supportsTools
                  ? `If you need specific details not covered by the summary, call the search_page tool.` +
                    (pageIndex.chunks.length === 0
                      ? ""
                      : ` ${pageIndex.chunks.length} indexed passages are available for retrieval.`)
                  : "";
                system +=
                  `\n\nThe user is viewing this page. Use this summary as primary context:\n\n` +
                  `Title: ${pageIndex.title}\nURL: ${pageIndex.url}\n\n${pageIndex.summary}` +
                  (toolHint ? `\n\n${toolHint}` : "");
              }

              if (supportsTools && pageIndex.chunks.length > 0) {
                const pageUrl = pageIndex.url;
                tools = {
                  ...tools,
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

              if (isFresh) {
                writeRagStatus(writer, {
                  phase: "ready",
                  title: pageIndex.title,
                  url: pageIndex.url,
                  chunkCount: pageIndex.chunks.length,
                });
              }
            } catch (err) {
              const body = (content.markdown.trim() || content.text.trim()).slice(
                0,
                16_000,
              );
              if (body) {
                system +=
                  `\n\nThe user is viewing this page:\n\n` +
                  `Title: ${content.title}\nURL: ${content.url}\n\n${body}`;
              }
              const message = err instanceof Error ? err.message : String(err);
              this.onRagError(
                `Page indexing failed — using full page text instead. ${message}`,
              );
              writeRagStatus(writer, {
                phase: "fallback",
                title: content.title,
                url: content.url,
                error: message,
              });
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

        writer.merge(
          toUIMessageStream({ stream: result.fullStream, sendStart: false }),
        );
      },
    });
  }

  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null);
  }
}

export interface UseChatOptions {
  id?: string;
  messages?: UIMessage[];
  onFinish?: (messages: UIMessage[]) => void;
}

export function useBrowserGptChat(
  settings: ChatSettings,
  options: UseChatOptions = {},
) {
  const { id, messages: initialMessages, onFinish } = options;
  const settingsRef = useRef(settings);
  const onFinishRef = useRef(onFinish);
  const agentProfileRef = useRef<AgentProfileId>("default");
  const confirmBridge = useMemo(() => new ConfirmationBridge(), []);

  const transport = useMemo(
    () =>
      new BrowserGptTransport(
        settingsRef,
        agentProfileRef,
        confirmBridge,
        (message) => toast.error(message),
      ),
    [confirmBridge],
  );

  const chat = useChat({
    transport,
    id,
    messages: initialMessages,
    onFinish: ({ messages }) => onFinishRef.current?.(messages),
  });

  const setAgentProfile = useCallback((profileId: AgentProfileId) => {
    agentProfileRef.current = profileId;
  }, []);

  // Keep the refs in sync so the transport/callback always read current values.
  settingsRef.current = settings;
  onFinishRef.current = onFinish;

  return { ...chat, confirmBridge, setAgentProfile };
}
