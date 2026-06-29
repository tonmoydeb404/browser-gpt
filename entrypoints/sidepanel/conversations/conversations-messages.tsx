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
          <ConversationsMessage key={message.id} message={message} />
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
};
