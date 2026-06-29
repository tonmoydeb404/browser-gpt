import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { ConfirmationBridge } from "@/contexts/conversations/agents/confirm";
import type { UIMessage } from "ai";
import { ConversationsMessage } from "./conversations-message";

export const ConversationsMessages = ({
  messages,
  confirmBridge,
}: {
  messages: UIMessage[];
  confirmBridge?: ConfirmationBridge;
}) => {
  return (
    <Conversation>
      <ConversationContent>
        {messages.length === 0 && (
          <ConversationEmptyState
            title="Start a conversation"
            description="Ask anything — your chats are saved locally."
          />
        )}
        {messages.map((message) => (
          <ConversationsMessage
            confirmBridge={confirmBridge}
            key={message.id}
            message={message}
          />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};
