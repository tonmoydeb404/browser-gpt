# WXT + React

This template should help get you started developing with React in WXT.

## Configuration

On first launch, Browser GPT runs an onboarding wizard that asks for your
name, OpenRouter API key, and preferred model. You can optionally prefill
these by creating a `.env` file (copy from `.env.example`):

| Variable                     | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `VITE_BROWSER_GPT_USERNAME`  | Display name shown in the sidebar         |
| `VITE_OPENROUTER_API_KEY`    | OpenRouter API key                        |
| `VITE_BROWSER_GPT_MODEL`     | Default model id (e.g. `anthropic/...`)   |

These values are **inlined at build time** and only prefill the wizard inputs —
they are not a runtime fallback. Because they're baked into the bundle, avoid
putting secrets in a build you distribute publicly.
