import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import type { RagPhase, RagStatusData } from "@/contexts/conversations/rag";
import { reindexActivePage } from "@/contexts/conversations/rag/reindex";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  FileTextIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const LABELS: Record<RagPhase, string> = {
  indexing: "Indexing page…",
  ready: "Page indexed",
  fallback: "Indexing failed — using full page",
  unavailable: "No page context",
};

function PhaseIcon({ phase }: { phase: RagPhase }): ReactNode {
  if (phase === "indexing")
    return <Spinner className="size-4" />;
  if (phase === "ready")
    return <CheckIcon className="size-4 text-emerald-500" />;
  if (phase === "unavailable")
    return <CircleAlertIcon className="size-4 text-amber-500" />;
  return <AlertTriangleIcon className="size-4 text-amber-500" />;
}

function ReindexButton() {
  const [running, setRunning] = useState(false);

  const handle = async () => {
    setRunning(true);
    try {
      const { title } = await reindexActivePage();
      toast.success(`Re-indexed “${title}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-index failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button
      aria-label="Re-index page"
      disabled={running}
      onClick={handle}
      size="icon-xs"
      title="Re-index the current page"
      type="button"
      variant="ghost"
    >
      {running ? (
        <Spinner className="size-3" />
      ) : (
        <RefreshCwIcon className="size-3" />
      )}
    </Button>
  );
}

export function RagStatusAnnotation({
  status,
}: {
  status: RagStatusData;
}) {
  const { phase, title, url, chunkCount, error } = status;

  let detail = "";
  if (phase === "ready" && typeof chunkCount === "number") {
    detail = ` · ${chunkCount} ${chunkCount === 1 ? "passage" : "passages"}`;
  }

  const hasDetails = Boolean(title || url || error);
  const canReindex = phase === "ready" && Boolean(url);

  return (
    <Task defaultOpen={false} className="mb-1">
      <div className="flex items-center gap-1">
        <TaskTrigger
          className="min-w-0 flex-1"
          title={`${LABELS[phase]}${detail}`}
        >
          <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
            <PhaseIcon phase={phase} />
            <span className="truncate">
              {LABELS[phase]}
              {detail}
            </span>
            {hasDetails && (
              <ChevronDownIcon className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            )}
          </div>
        </TaskTrigger>
        {canReindex && <ReindexButton />}
      </div>
      {hasDetails && (
        <TaskContent>
          {title && (
            <TaskItem className="flex items-center gap-1.5">
              <FileTextIcon className="size-3.5 shrink-0" />
              <span className="truncate">{title}</span>
            </TaskItem>
          )}
          {url && (
            <TaskItem className="truncate text-xs">{url}</TaskItem>
          )}
          {error && (
            <TaskItem className="text-destructive text-xs">{error}</TaskItem>
          )}
        </TaskContent>
      )}
    </Task>
  );
}
