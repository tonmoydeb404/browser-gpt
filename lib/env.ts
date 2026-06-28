/**
 * Build-time environment configuration.
 *
 * Values are defined in a `.env` file at the project root and are statically
 * inlined by Vite (WXT) at build time. They are used to prefill the onboarding
 * wizard; they are NOT a runtime fallback.
 */

/* eslint-disable @typescript-eslint/no-empty-object-type */
interface ImportMetaEnv {
  readonly VITE_BROWSER_GPT_USERNAME?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_BROWSER_GPT_MODEL?: string;
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

interface EnvConfig {
  username?: string;
  apiKey?: string;
  model?: string;
}

/**
 * Read env-provided config values, returning only non-empty strings.
 */
export function getEnvConfig(): EnvConfig {
  const config: EnvConfig = {};

  const username = import.meta.env.VITE_BROWSER_GPT_USERNAME;
  if (typeof username === "string" && username.trim()) {
    config.username = username.trim();
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (typeof apiKey === "string" && apiKey.trim()) {
    config.apiKey = apiKey.trim();
  }

  const model = import.meta.env.VITE_BROWSER_GPT_MODEL;
  if (typeof model === "string" && model.trim()) {
    config.model = model.trim();
  }

  return config;
}
