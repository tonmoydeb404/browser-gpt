import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import type { UIMessage } from "ai";
import { ConversationsMessage } from "./conversations-message";

export const ConversationsMessages = ({
  messages,
}: {
  messages: UIMessage[];
}) => {
  if (messages.length === 0) {
    return (
      <Conversation className="flex-1">
        <ConversationEmptyState
          title="Start a conversation"
          description="Ask anything — your chats are saved locally."
        />
      </Conversation>
    );
  }

  return (
    <Conversation className="flex-1">
      <ConversationContent>
        {messages.map((message) => (
          <ConversationsMessage key={message.id} message={message} />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};
