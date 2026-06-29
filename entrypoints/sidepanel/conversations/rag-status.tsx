import { Spinner } from "@/components/ui/spinner";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import type { RagPhase, RagStatusData } from "@/contexts/conversations/rag";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  FileTextIcon,
} from "lucide-react";
import type { ReactNode } from "react";

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

  return (
    <Task defaultOpen={false} className="mb-1">
      <TaskTrigger title={`${LABELS[phase]}${detail}`}>
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
