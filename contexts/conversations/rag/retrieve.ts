import { cosineSimilarity } from "ai";
import { embed } from "./embed";
import { getPageIndex } from "./store";

/**
 * Semantic retrieval: embed the query and return the most relevant page chunks
 * via cosine similarity against the stored chunk vectors.
 */
export async function retrieveRelevant(
  query: string,
  url: string,
  topK = 5,
): Promise<string[]> {
  const index = await getPageIndex(url);
  if (!index || index.chunks.length === 0) return [];

  const queryVector = await embed(query);

  const scored = index.chunks.map((chunk) => ({
    text: chunk.text,
    score: cosineSimilarity(queryVector, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((s) => s.text);
}
