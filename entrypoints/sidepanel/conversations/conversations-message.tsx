import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message";
import type { ConfirmationBridge } from "@/contexts/conversations/agents/confirm";
import type {
  AgentStepData,
  AskRequest,
  ConfirmRequest,
  ImageData,
  SitemapData,
  SourceCitation,
} from "@/contexts/conversations/agents/types";
import type { RagStatusData } from "@/contexts/conversations/rag";
import { memo } from "react";
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";
import {
  AgentStepsPart,
  AskPart,
  ConfirmationPart,
  ImagesPart,
  ReasoningPart,
  SitemapPart,
  SourcesPart,
  SourceUrlPart,
  StepStartSeparator,
  ToolCallPart,
} from "./conversations-message-parts";
import { MessageResponse } from "@/components/ai-elements/message";
import { RagStatusAnnotation } from "./rag-status";

type ToolPart = ToolUIPart | DynamicToolUIPart;

/** Returns the most recent RAG status part on the message (live state wins). */
function findRagStatus(
  parts: UIMessage["parts"],
): RagStatusData | undefined {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.type === "data-rag-status") {
      return (part as { data: RagStatusData }).data;
    }
  }
  return undefined;
}

export const ConversationsMessage = memo(function ConversationsMessage({
  message,
  confirmBridge,
}: {
  message: UIMessage;
  confirmBridge?: ConfirmationBridge;
}) {
  const ragStatus = findRagStatus(message.parts);

  return (
    <Message from={message.role}>
      <MessageContent>
        {ragStatus && <RagStatusAnnotation status={ragStatus} />}
        {message.parts.map((part, i) => {
          const key = `${message.id}-${i}`;

          if (part.type === "text" && part.text) {
            return (
              <MessageResponse key={key}>{part.text}</MessageResponse>
            );
          }

          if (part.type === "reasoning") {
            return (
              <ReasoningPart
                key={key}
                state={part.state}
                text={part.text}
              />
            );
          }

          if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
            return (
              <ToolCallPart key={key} part={part as unknown as ToolPart} />
            );
          }

          if (part.type === "data-rag-status") return null;

          if (part.type === "data-agent-steps") {
            return (
              <AgentStepsPart
                key={key}
                steps={
                  (part as { data: { steps: AgentStepData[] } }).data.steps
                }
              />
            );
          }

          if (part.type === "data-confirmation") {
            return (
              <ConfirmationPart
                key={key}
                bridge={confirmBridge}
                data={(part as { data: ConfirmRequest }).data}
              />
            );
          }

          if (part.type === "data-ask-request") {
            return (
              <AskPart
                key={key}
                bridge={confirmBridge}
                data={(part as { data: AskRequest }).data}
              />
            );
          }

          if (part.type === "data-sources") {
            return (
              <SourcesPart
                key={key}
                sources={
                  (part as { data: { sources: SourceCitation[] } }).data.sources
                }
              />
            );
          }

          if (part.type === "data-sitemap") {
            return (
              <SitemapPart
                key={key}
                data={(part as { data: SitemapData }).data}
              />
            );
          }

          if (part.type === "data-images") {
            return (
              <ImagesPart
                key={key}
                images={
                  (part as { data: { images: ImageData[] } }).data.images
                }
              />
            );
          }

          if (part.type === "source-url") {
            return (
              <SourceUrlPart
                key={key}
                title={
                  (part as { title?: string }).title
                }
                url={(part as { url: string }).url}
              />
            );
          }

          if (part.type === "step-start") {
            return <StepStartSeparator key={key} />;
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
});
