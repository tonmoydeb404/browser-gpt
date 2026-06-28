import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { memo } from "react";
import type { UIMessage } from "ai";

export const ConversationsMessage = memo(function ConversationsMessage({
  message,
}: {
  message: UIMessage;
}) {
  return (
    <Message from={message.role}>
      <MessageContent>
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
