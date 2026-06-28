import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/contexts/conversations";
import {
  CheckIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

export const SessionsDialog = () => {
  const {
    sessions,
    activeSession,
    isSessionsOpen,
    closeSessions,
    selectSession,
    deleteSession,
    renameSession,
    newSession,
  } = useConversations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setDraft(title);
  };
  const cancelEdit = () => setEditingId(null);
  const commitEdit = async () => {
    if (!editingId) {
      return;
    }
    const title = draft.trim();
    if (title) {
      await renameSession(editingId, title);
    }
    setEditingId(null);
  };
  const handleSelect = async (id: string) => {
    await selectSession(id);
    closeSessions();
  };
  const handleNew = async () => {
    await newSession();
    closeSessions();
  };

  return (
    <ModelSelector
      onOpenChange={(open) => {
        if (!open) {
          closeSessions();
        }
      }}
      open={isSessionsOpen}
    >
      <ModelSelectorContent title="Chat history">
        <ModelSelectorInput placeholder="Search chats..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No chats found.</ModelSelectorEmpty>

          <ModelSelectorGroup heading="New">
            <ModelSelectorItem
              keywords={["new chat", "create"]}
              onSelect={() => void handleNew()}
              value="__new__"
            >
              <PlusIcon />
              <ModelSelectorName>New chat</ModelSelectorName>
            </ModelSelectorItem>
          </ModelSelectorGroup>

          <ModelSelectorGroup heading="Recent">
            {sessions.map((s) => {
              if (editingId === s.id) {
                return (
                  <div
                    className="flex items-center gap-1 rounded-xl px-2 py-1.5"
                    key={s.id}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      className="h-7 flex-1 rounded-md bg-input/50 px-2 text-sm outline-none"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void commitEdit();
                        } else if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      value={draft}
                    />
                    <Button
                      onClick={() => void commitEdit()}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <CheckIcon className="size-4" />
                    </Button>
                    <Button onClick={cancelEdit} size="icon-sm" variant="ghost">
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                );
              }

              return (
                <ModelSelectorItem
                  key={s.id}
                  keywords={[s.title]}
                  onSelect={() => void handleSelect(s.id)}
                  value={s.id}
                  hideCheckIcon
                >
                  <MessageSquareIcon />
                  <ModelSelectorName>{s.title}</ModelSelectorName>
                  <div
                    className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-data-selected/command-item:opacity-100"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                  >
                    <Button
                      aria-label="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(s.id, s.title);
                      }}
                      size="icon-sm"
                      variant="ghost"
                      className="dark:hover:bg-white/20! "
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteSession(s.id);
                      }}
                      size="icon-sm"
                      variant="ghost"
                      className="dark:hover:bg-white/20! "
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </ModelSelectorItem>
              );
            })}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
