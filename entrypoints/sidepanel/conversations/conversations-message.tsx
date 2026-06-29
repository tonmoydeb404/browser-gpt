import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { RagStatusData } from "@/contexts/conversations/rag";
import { memo } from "react";
import type { UIMessage } from "ai";
import { RagStatusAnnotation } from "./rag-status";

/** Returns the most recent RAG status part on the message (live state wins). */
function findRagStatus(
  parts: UIMessage["parts"],
): RagStatusData | undefined {
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.type === "data-rag-status") {
      return part.data as RagStatusData;
    }
  }
  return undefined;
}

export const ConversationsMessage = memo(function ConversationsMessage({
  message,
}: {
  message: UIMessage;
}) {
  const ragStatus = findRagStatus(message.parts);

  return (
    <Message from={message.role}>
      <MessageContent>
        {ragStatus && <RagStatusAnnotation status={ragStatus} />}
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text) {
            return (
              <MessageResponse key={`${message.id}-${i}`}>
                {part.text}
              </MessageResponse>
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
});
