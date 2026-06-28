import { useConfig } from "@/contexts/config";
import { SparklesIcon } from "lucide-react";
import { ChatModelSelectorTrigger } from "../components/chat-model-selector";

/* ---------- Step 3: Model Selection ---------- */

export function ModelStep() {
  const { model } = useConfig();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <SparklesIcon className="size-8 text-primary" />
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold">Choose your model</h2>
          <p className="text-sm text-muted-foreground">
            {model.isLoading
              ? "Loading models…"
              : "Pick the AI model you'd like to use."}
          </p>
        </div>

        <div className="w-full">
          <ChatModelSelectorTrigger className="w-full" />
        </div>
      </div>
    </div>
  );
}
