/**
 * Local embeddings via transformers.js (ONNX Runtime Web).
 *
 * Lazy-loaded so the model + WASM runtime live in a separate bundle chunk and
 * only download on first use. Runs single-threaded on the main thread to avoid
 * SharedArrayBuffer / worker CSP requirements inside a Chrome extension.
 */



const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<Embedder> | null = null;

interface Embedder {
  (texts: string[], options: { pooling: "mean"; normalize: true }): Promise<{
    tolist: () => number[][];
  }>;
}

async function getExtractor(): Promise<Embedder> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");

      // Models are downloaded from the HF hub; no bundled local models.
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // Avoid SharedArrayBuffer (requires COOP/COEP, unavailable in extensions)
      // and proxy workers (cross-origin WASM worker can hit MV3 CSP).
      const wasm = env.backends.onnx.wasm;
      if (wasm) {
        wasm.numThreads = 1;
        wasm.proxy = false;
        // Load ORT WASM glue + binaries from the extension's own origin so
        // they satisfy MV3 CSP (script-src 'self').  Files are copied to
        // public/ort-wasm/ by the copyOrtWasm Vite plugin in wxt.config.ts.
        wasm.wasmPaths = chrome.runtime.getURL("ort-wasm/");
      }

      return pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
      }) as Promise<Embedder>;
    })();
  }
  return extractorPromise;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}

export async function embed(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector;
}
