import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  useDomSelections,
  type DomSelection,
} from "@/contexts/conversations/dom-selection";
import { useConversations } from "@/contexts/conversations";
import type { ChatStatus } from "ai";
import { useState } from "react";
import { MousePointerClick, XIcon } from "lucide-react";
import { ChatModelSelectorTrigger } from "../components/chat-model-selector";

interface Props {
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop: () => void;
}

/** Formats a picked element into a model-visible context block. */
function formatDomSelection(s: DomSelection): string {
  const meta = [`selector: "${s.selector}"`, `tag: ${s.tagName}`];
  if (s.role) meta.push(`role: ${s.role}`);
  if (s.href) meta.push(`href: ${s.href}`);
  const label = s.label ? ` "${s.label}"` : "";
  const body = (s.markdown.trim() || s.text.trim()).slice(0, 4000);
  return (
    `The user selected this element on the page to focus on [${meta.join(", ")}]${label}:\n` +
    `<content>\n${body}\n</content>`
  );
}

export const ConversationsPrompt = ({ status, onSend, onStop }: Props) => {
  const [text, setText] = useState<string>("");
  const { pendingSelection, clearPendingSelection } = useConversations();
  const {
    selections,
    isPicking,
    startPicker,
    stopPicker,
    remove,
    clear: clearSelections,
  } = useDomSelections();

  const handleSubmit = (message: PromptInputMessage) => {
    const content = message.text.trim();
    if (!content && !pendingSelection && selections.length === 0) {
      return;
    }

    let final = content;

    if (selections.length > 0) {
      final =
        selections.map(formatDomSelection).join("\n\n") +
        (content ? `\n\n${content}` : "");
      clearSelections();
    }

    if (pendingSelection) {
      final =
        `The user selected this text on the page and wants to discuss it:\n\n` +
        `> ${pendingSelection.text}\n\n${final}`;
      clearPendingSelection();
    }

    onSend(final);
    setText("");
  };

  return (
    <div className="grid shrink-0 gap-4 pt-4">
      <div className="w-full px-4 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            {pendingSelection && (
              <div className="flex w-full items-start gap-2 px-2.5 pt-2">
                <blockquote className="line-clamp-3 flex-1 border-l-2 border-primary/40 pl-2 text-xs text-muted-foreground italic">
                  {pendingSelection.text}
                </blockquote>
                <Button
                  aria-label="Remove selection"
                  onClick={clearPendingSelection}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            )}

            {selections.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-1.5 px-2.5 pt-2">
                {selections.map((s) => (
                  <div
                    className="flex h-7 max-w-full items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-1.5 text-xs"
                    key={s.id}
                    title={s.selector}
                  >
                    <span className="max-w-40 truncate font-medium">
                      {s.label || s.tagName}
                    </span>
                    <Button
                      aria-label="Remove element"
                      onClick={() => remove(s.id)}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isPicking && (
              <div className="flex w-full items-center gap-2 px-2.5 pt-2 text-xs text-muted-foreground">
                <span className="animate-pulse">
                  Picking elements — click one on the page
                </span>
                <Button
                  onClick={stopPicker}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  Done
                </Button>
              </div>
            )}

            <PromptInputTextarea
              onChange={(e) => setText(e.target.value)}
              placeholder="Send a message..."
              value={text}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <Button
                aria-label="Pick element on page"
                disabled={isPicking}
                onClick={startPicker}
                size="icon-sm"
                title="Pick element on page"
                type="button"
                variant="ghost"
              >
                <MousePointerClick />
              </Button>
              <ChatModelSelectorTrigger
                onlyIcon
                size="icon-sm"
                variant="ghost"
              />
            </PromptInputTools>
            <PromptInputSubmit
              disabled={
                status === "ready" &&
                !text.trim() &&
                !pendingSelection &&
                selections.length === 0
              }
              onStop={onStop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
