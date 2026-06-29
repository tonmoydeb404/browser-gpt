import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent,
} from "@/components/ai-elements/chain-of-thought";
import {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "@/components/ai-elements/confirmation";
import type { ConfirmationBridge } from "@/contexts/conversations/agents/confirm";
import type {
  AgentStepData,
  AskRequest,
  ConfirmRequest,
  ImageData,
  SitemapData,
  SourceCitation,
} from "@/contexts/conversations/agents/types";
import { GlobeIcon, ImageOffIcon, ImageIcon, LinkIcon, MessageCircleQuestionIcon, SendIcon, TerminalIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";
import { ConversationsSitemap } from "./conversations-sitemap";

type ToolPart = ToolUIPart | DynamicToolUIPart;

export function ToolCallPart({ part }: { part: ToolPart }) {
  const isDynamic = part.type === "dynamic-tool";

  const headerProps = isDynamic
    ? { type: "dynamic-tool" as const, state: part.state, toolName: (part as DynamicToolUIPart).toolName }
    : { type: part.type, state: part.state };

  return (
    <Tool defaultOpen={false}>
      <ToolHeader {...headerProps} />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput output={part.output} errorText={part.errorText} />
      </ToolContent>
    </Tool>
  );
}

export function ReasoningPart({
  text,
  state,
}: {
  text: string;
  state?: string;
}) {
  if (!text) return null;
  return (
    <Reasoning isStreaming={state === "streaming"}>
      <ReasoningTrigger />
      <ReasoningContent>{text}</ReasoningContent>
    </Reasoning>
  );
}

export function AgentStepsPart({ steps }: { steps: AgentStepData[] }) {
  const hasRunning = steps.some((s) => s.status === "running");

  return (
    <ChainOfThought defaultOpen={hasRunning}>
      <ChainOfThoughtHeader>
        {steps.length} step{steps.length !== 1 ? "s" : ""}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step, i) => (
          <ChainOfThoughtStep
            key={`${step.label}-${i}`}
            label={
              <span>
                {step.label}
                {step.detail && (
                  <span className="text-muted-foreground/70">
                    {" "}&middot; {step.detail}
                  </span>
                )}
              </span>
            }
            status={
              step.status === "done"
                ? "complete"
                : step.status === "running"
                  ? "active"
                  : "pending"
            }
          />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

export function ConfirmationPart({
  data,
  bridge,
}: {
  data: ConfirmRequest;
  bridge?: ConfirmationBridge;
}) {
  return (
    <Confirmation
      approval={{
        id: data.id,
      }}
      state="approval-requested"
    >
      <ConfirmationTitle>{data.action}</ConfirmationTitle>
      <ConfirmationRequest>
        {data.description && (
          <p className="text-muted-foreground text-xs">{data.description}</p>
        )}
      </ConfirmationRequest>
      <ConfirmationAccepted>
        <span>Approved</span>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <span>Rejected</span>
      </ConfirmationRejected>
      {bridge && (
        <ConfirmationActions>
          <ConfirmationAction
            onClick={() => bridge.respond(data.id, false)}
            variant="outline"
          >
            Reject
          </ConfirmationAction>
          <ConfirmationAction
            onClick={() => bridge.respond(data.id, true)}
            variant="default"
          >
            Approve
          </ConfirmationAction>
        </ConfirmationActions>
      )}
    </Confirmation>
  );
}

export function SourcesPart({ sources }: { sources: SourceCitation[] }) {
  if (sources.length === 0) return null;
  return (
    <Sources>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((s, i) => (
          <Source
            href={s.url}
            key={`${s.url}-${i}`}
            title={s.title}
          >
            <LinkIcon className="h-4 w-4 shrink-0" />
            <span className="block truncate font-medium">{s.title}</span>
          </Source>
        ))}
      </SourcesContent>
    </Sources>
  );
}

export function SourceUrlPart({
  url,
  title,
}: {
  url: string;
  title?: string;
}) {
  return (
    <a
      className="not-prose inline-flex items-center gap-1 text-xs text-primary hover:underline"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      <LinkIcon className="size-3" />
      <span className="truncate">{title ?? url}</span>
    </a>
  );
}

export function StepStartSeparator() {
  return (
    <div className="not-prose my-2 flex items-center gap-2 text-muted-foreground/40">
      <div className="h-px flex-1 bg-border/50" />
      <TerminalIcon className="size-3" />
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

export function AskPart({
  data,
  bridge,
}: {
  data: AskRequest;
  bridge?: ConfirmationBridge;
}) {
  return <AskPartInner data={data} bridge={bridge} />;
}

function AskPartInner({
  data,
  bridge,
}: {
  data: AskRequest;
  bridge?: ConfirmationBridge;
}) {
  const [value, setValue] = useState("");
  const [answered, setAnswered] = useState<string | null>(null);

  useEffect(() => {
    setValue("");
    setAnswered(null);
  }, [data.id]);

  const handleSubmit = () => {
    if (!value.trim() || !bridge) return;
    bridge.askRespond(data.id, value.trim());
    setAnswered(value.trim());
  };

  return (
    <div className="not-prose my-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <MessageCircleQuestionIcon className="size-4 text-primary" />
        <span className="text-sm font-medium">{data.question}</span>
      </div>
      {answered !== null ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckIcon className="size-3 text-emerald-500" />
          <span>{answered}</span>
        </div>
      ) : (
        bridge && (
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder={data.placeholder ?? "Type your answer..."}
              value={value}
            />
            <Button
              disabled={!value.trim()}
              onClick={handleSubmit}
              size="icon-sm"
              type="button"
            >
              <SendIcon className="size-3.5" />
            </Button>
          </div>
        )
      )}
    </div>
  );
}

export function SitemapPart({ data }: { data: SitemapData }) {
  if (data.nodes.length === 0) return null;

  return (
    <div className="not-prose my-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <GlobeIcon className="size-3" />
        <span>Site Map ({data.nodes.length} pages)</span>
      </div>
      <ConversationsSitemap nodes={data.nodes} edges={data.edges} />
    </div>
  );
}

export function ImagesPart({ images }: { images: ImageData[] }) {
  if (images.length === 0) return null;

  return (
    <div className="not-prose my-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ImageIcon className="size-3" />
        <span>Images ({images.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, i) => (
          <ImageTile key={`${img.src}-${i}`} image={img} />
        ))}
      </div>
    </div>
  );
}

function ImageTile({ image }: { image: ImageData }) {
  const [broken, setBroken] = useState(false);
  const dims =
    image.width && image.height ? `${image.width}x${image.height}` : null;

  useEffect(() => {
    setBroken(false);
  }, [image.src]);

  return (
    <a
      className="group overflow-hidden rounded-lg border bg-muted/30 transition-colors hover:bg-muted/60"
      href={image.src}
      rel="noreferrer"
      target="_blank"
      title={image.src}
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
        {broken ? (
          <ImageOffIcon className="size-5 text-muted-foreground/50" />
        ) : (
          <img
            alt={image.alt ?? ""}
            className="size-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            onError={() => setBroken(true)}
            src={image.src}
          />
        )}
      </div>
      <div className="space-y-0.5 p-1.5">
        <p className="line-clamp-2 text-xs leading-tight">
          {image.alt || (
            <span className="italic text-muted-foreground/70">no alt text</span>
          )}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          {dims && <span className="shrink-0">{dims}</span>}
          <span className="truncate">{image.src}</span>
        </div>
      </div>
    </a>
  );
}
