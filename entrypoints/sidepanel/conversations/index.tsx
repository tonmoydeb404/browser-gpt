import { Spinner } from "@/components/ui/spinner";
import { useConfig } from "@/contexts/config";
import { useConversations, type ActiveSession } from "@/contexts/conversations";
import { saveMessages } from "@/lib/conversations/store";
import { useBrowserChat } from "@/lib/use-browser-chat";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ConversationsHeader } from "./conversations-header";
import { ConversationsMessages } from "./conversations-messages";
import { ConversationsPrompt } from "./conversations-prompt";

export const Conversations = () => {
  const { isReady, activeSession } = useConversations();

  if (!isReady || !activeSession) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <ChatRunner key={activeSession.id} session={activeSession} />;
};

const ChatRunner = ({ session }: { session: ActiveSession }) => {
  const { settings } = useConfig();

  const browserSettings = useMemo(
    () => ({
      apiKey: settings.value.apiKey,
      model: settings.value.model,
      autoAttach: settings.value.autoAttach,
      agentMode: settings.value.agentMode,
      maxAgentSteps: settings.value.maxAgentSteps,
    }),
    [settings],
  );

  const handleFinish = useCallback(
    (messages: UIMessage[]) => {
      void saveMessages(session.id, messages).catch(() => {
        toast.error("Failed to save conversation");
      });
    },
    [session.id],
  );

  const chat = useBrowserChat(browserSettings, {
    id: session.id,
    messages: session.messages,
    onFinish: handleFinish,
  });

  useEffect(() => {
    if (chat.error) {
      toast.error(chat.error.message);
    }
  }, [chat.error]);

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <ConversationsHeader />
      <ConversationsMessages messages={chat.messages} />
      <ConversationsPrompt
        onStop={chat.stop}
        onSend={(text) => chat.sendMessage({ text })}
        status={chat.status}
      />
    </div>
  );
};
