import { Button } from "@/components/ui/button";
import { useConfig } from "@/contexts/config";
import { useConversations } from "@/contexts/conversations";
import { BrainCircuit, LucideMessagesSquare, LucideSettings, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ConversationsHeader = () => {
  const { mode, setMode, openSessions } = useConversations();
  const { settings } = useConfig();

  return (
    <header className="flex shrink-0 items-center gap-1 border-b px-3 py-2">
      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
        <Button
          aria-label="Chat mode"
          className={cn(
            "h-7 gap-1.5 rounded-md px-2.5",
            mode === "chat"
              ? "bg-background shadow-sm"
              : "bg-transparent hover:bg-background/50",
          )}
          onClick={() => setMode("chat")}
          size="sm"
          variant="ghost"
        >
          <MessageCircle className="size-3.5" />
          <span className="text-xs font-medium">Chat</span>
        </Button>
        <Button
          aria-label="Agent mode"
          className={cn(
            "h-7 gap-1.5 rounded-md px-2.5",
            mode === "agent"
              ? "bg-background shadow-sm"
              : "bg-transparent hover:bg-background/50",
          )}
          onClick={() => setMode("agent")}
          size="sm"
          variant="ghost"
        >
          <BrainCircuit className="size-3.5" />
          <span className="text-xs font-medium">Agent</span>
        </Button>
      </div>

      <div className="flex-1" />

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
