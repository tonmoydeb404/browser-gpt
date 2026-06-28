import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/config";
import { useConversations } from "@/contexts/conversations";
import { LucideMessagesSquare, LucideSettings } from "lucide-react";

export const ConversationsHeader = () => {
  const { openSessions } = useConversations();
  const { settings } = useConfig();

  return (
    <header className="flex shrink-0 items-center justify-end gap-1 border-b px-3 py-2">
      <Button
        aria-label="Chat history"
        onClick={openSessions}
        size="icon-sm"
        variant="outline"
      >
        <LucideMessagesSquare />
      </Button>

      <Button
        aria-label="Settings"
        onClick={settings.onModalOpen}
        size="icon-sm"
        variant="outline"
      >
        <LucideSettings />
      </Button>
    </header>
  );
};
