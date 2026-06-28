/**
 * Recursive character text splitter for RAG chunking.
 * Splits hierarchically (paragraphs → sentences → words) to keep chunks coherent.
 */

export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
}

const SPLITTERS = ["\n\n", "\n", ". ", "? ", "! ", " ", ""] as const;

export function chunkText(
  text: string,
  { maxChars = 1500, overlap = 150 }: ChunkOptions = {},
): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  const split = (segment: string, depth: number) => {
    if (segment.length <= maxChars) {
      if (segment.trim()) chunks.push(segment.trim());
      return;
    }

    const splitter = SPLITTERS[Math.min(depth, SPLITTERS.length - 1)];
    const pieces = segment.split(splitter);

    let buffer = "";
    for (const piece of pieces) {
      const candidate = buffer ? buffer + splitter + piece : piece;

      if (candidate.length > maxChars && buffer) {
        if (buffer.trim()) chunks.push(buffer.trim());
        // carry overlap from the tail of the buffer
        buffer = buffer.slice(Math.max(0, buffer.length - overlap)) + splitter + piece;
      } else {
        buffer = candidate;
      }

      // A single piece still too large → split deeper
      if (piece.length > maxChars && depth < SPLITTERS.length - 1) {
        split(piece, depth + 1);
        buffer = "";
      }
    }

    if (buffer.trim()) chunks.push(buffer.trim());
  };

  split(cleaned, 0);
  // de-duplicate near-identical trailing chunks
  return chunks.filter((c, i) => i === 0 || c !== chunks[i - 1]);
}
