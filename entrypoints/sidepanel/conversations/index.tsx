import { Spinner } from "@/components/ui/spinner";
import { useConfig } from "@/contexts/config";
import { useConversations, type ActiveSession } from "@/contexts/conversations";
import { useBrowserGptChat } from "@/contexts/conversations/hooks/use-chat";
import {
  isContentAvailable,
  readActiveTabContent,
} from "@/contexts/conversations/messaging";
import { ensurePageIndexed } from "@/contexts/conversations/rag";
import { reindexActivePage, setReindexHandler } from "@/contexts/conversations/rag/reindex";
import { deletePageIndex } from "@/contexts/conversations/rag/store";
import { saveMessages } from "@/contexts/conversations/session-store";
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
  const { settings, model } = useConfig();
  const { mode } = useConversations();

  const browserSettings = useMemo(
    () => ({
      apiKey: settings.value.apiKey,
      model: settings.value.model,
      autoAttach: settings.value.autoAttach,
      supportsTools: model.value?.supportsTools ?? false,
      mode,
    }),
    [settings, model, mode],
  );

  const handleFinish = useCallback(
    (messages: UIMessage[]) => {
      void saveMessages(session.id, messages).catch(() => {
        toast.error("Failed to save conversation");
      });
    },
    [session.id],
  );

  const chat = useBrowserGptChat(browserSettings, {
    id: session.id,
    messages: session.messages,
    onFinish: handleFinish,
  });

  useEffect(() => {
    if (chat.error) {
      toast.error(chat.error.message);
    }
  }, [chat.error]);

  // Register the active-page re-index handler used by the RAG status UI.
  // Always re-indexes the currently active tab from fresh content.
  useEffect(() => {
    setReindexHandler(async () => {
      const content = await readActiveTabContent();
      if (!content.url || !isContentAvailable(content)) {
        throw new Error("No accessible page to index.");
      }
      await deletePageIndex(content.url);
      const index = await ensurePageIndexed(content, {
        apiKey: settings.value.apiKey,
        model: settings.value.model ?? "",
      });
      return { title: index.title, url: index.url };
    });
    return () => setReindexHandler(null);
  }, [settings.value.apiKey, settings.value.model]);

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <ConversationsHeader />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConversationsMessages
          confirmBridge={chat.confirmBridge}
          messages={chat.messages}
        />
      </div>
      <ConversationsPrompt
        messages={chat.messages}
        onStop={chat.stop}
        onSend={(text, profile) => {
          // /index is a direct action: re-index the active page without an
          // LLM round-trip. It does not add a message to the conversation.
          if (profile === "index") {
            const promise = reindexActivePage()
              .then(({ title }) => toast.success(`Re-indexed “${title}”`))
              .catch((err) =>
                toast.error(
                  err instanceof Error ? err.message : "Re-index failed",
                ),
              );
            void promise;
            return;
          }
          chat.setAgentProfile(profile);
          chat.sendMessage({ text });
        }}
        status={chat.status}
      />
    </div>
  );
};
