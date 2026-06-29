import type { PageContent } from "../messaging";
import { chunkText } from "./chunker";
import { embedBatch } from "./embed";
import { getPageIndex, setPageIndex, type PageIndex } from "./store";

export { getPageIndex } from "./store";
import { summarizePage } from "./summarize";

export type IndexStatus = "idle" | "indexing" | "ready" | "error";

/**
 * RAG status emitted as a `data-rag-status` message part so the UI can show
 * what's happening during indexing (and surface failures).
 */
export type RagPhase = "indexing" | "ready" | "fallback" | "unavailable";

export interface RagStatusData {
  phase: RagPhase;
  title?: string;
  url?: string;
  /** Number of indexed passages available for retrieval. */
  chunkCount?: number;
  /** Present when indexing failed and we fell back to raw content. */
  error?: string;
}

export interface EnsureIndexedOptions {
  apiKey: string;
  model: string;
  onStatus?: (status: IndexStatus) => void;
}

const EMPTY_INDEX_BASE = (content: PageContent): PageIndex => ({
  url: content.url,
  title: content.title,
  summary: "",
  chunks: [],
  indexedAt: Date.now(),
});

/**
 * Ensure a page is indexed (chunked + embedded + summarized) and cached in
 * IndexedDB keyed by URL. Returns the cached index on repeat visits.
 */
export async function ensurePageIndexed(
  content: PageContent,
  { apiKey, model, onStatus }: EnsureIndexedOptions,
): Promise<PageIndex> {
  const cached = await getPageIndex(content.url);
  if (cached) {
    onStatus?.("ready");
    return cached;
  }

  const body = content.markdown.trim() || content.text.trim();
  if (!body) {
    const empty = EMPTY_INDEX_BASE(content);
    await setPageIndex(empty);
    onStatus?.("ready");
    return empty;
  }

  onStatus?.("indexing");
  try {
    const chunkTexts = chunkText(body);
    const embeddings = await embedBatch(chunkTexts);
    const summary = await summarizePage(content, apiKey, model);

    const index: PageIndex = {
      url: content.url,
      title: content.title,
      summary,
      chunks: chunkTexts.map((text, i) => ({
        id: String(i),
        text,
        embedding: embeddings[i],
      })),
      indexedAt: Date.now(),
    };

    await setPageIndex(index);
    onStatus?.("ready");
    return index;
  } catch (err) {
    onStatus?.("error");
    throw err;
  }
}

export async function getCachedSummary(url: string): Promise<string | undefined> {
  return (await getPageIndex(url))?.summary;
}
