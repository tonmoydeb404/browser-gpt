import { Input } from "@/components/ui/input";
import { KeyIcon } from "lucide-react";

/* ---------- Step 2: API Key ---------- */

export function ApiKeyStep({
  apiKey,
  onChange,
  onSubmit,
}: {
  apiKey: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <KeyIcon className="size-8 text-primary" />
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Connect OpenRouter</h2>
          <p className="text-sm text-muted-foreground">
            Paste your API key to power AI chat. You can skip and add it later.
          </p>
        </div>

        <Input
          autoFocus
          type="password"
          autoComplete="off"
          placeholder="sk-or-v1-..."
          value={apiKey}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />

        <p className="text-center text-xs text-muted-foreground">
          Get one at{" "}
          <a
            className="underline"
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
          >
            openrouter.ai/keys
          </a>
        </p>
      </div>
    </div>
  );
}
