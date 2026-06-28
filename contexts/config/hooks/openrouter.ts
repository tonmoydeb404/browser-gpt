import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  supportsTools: boolean;
}

const MODELS_CACHE_KEY = "openrouter-models";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

interface CachedModels {
  models: ModelOption[];
  fetchedAt: number;
}

interface OpenRouterModel {
  id: string;
  name: string;
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  top_provider?: {
    context_length?: number;
  };
  supported_parameters?: string[];
}

/**
 * Fetch all available models from the OpenRouter public API.
 * Filters to text-output chat models only.
 */
export async function fetchModels(): Promise<ModelOption[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`OpenRouter API returned ${res.status}`);
  const data = (await res.json()) as { data: OpenRouterModel[] };

  return data.data
    .filter((m) => {
      const outputs = m.architecture?.output_modalities ?? [];
      return outputs.includes("text");
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.id.split("/")[0] ?? m.id,
      contextLength: m.context_length ?? m.top_provider?.context_length ?? 0,
      supportsTools: m.supported_parameters?.includes("tools") ?? false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load models from cache (if fresh) or fetch from the API.
 * Falls back to DEFAULT_MODELS on any error.
 */
export async function loadModelList(): Promise<ModelOption[]> {
  try {
    const stored = await browser.storage.local.get(MODELS_CACHE_KEY);
    const cached = stored[MODELS_CACHE_KEY] as CachedModels | undefined;
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.models;
    }
  } catch {
    // storage read failed — continue to fetch
  }

  try {
    const models = await fetchModels();
    await browser.storage.local.set({
      [MODELS_CACHE_KEY]: {
        models,
        fetchedAt: Date.now(),
      } satisfies CachedModels,
    });
    return models;
  } catch {
    return [];
  }
}

export function getModelOption(
  id: string,
  models: ModelOption[],
): ModelOption | undefined {
  return models.find((m) => m.id === id);
}

export function getModelName(id: string, models: ModelOption[]): string {
  return getModelOption(id, models)?.name ?? id;
}

/**
 * Create an OpenRouter model instance using the user's own API key.
 */
export function createModel(apiKey: string, modelId: string) {
  const openrouter = createOpenRouter({ apiKey });
  return openrouter(modelId);
}

// ----------------------------------------------------------------------

/**
 * React hook that loads the model list asynchronously.
 * Shows DEFAULT_MODELS immediately, then swaps to API models.
 */
export function useModels(): {
  data: ModelOption[];
  isLoading: boolean;
} {
  const [data, setData] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadModelList()
      .then((m) => {
        if (!cancelled) {
          setData(m);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading: loading };
}
