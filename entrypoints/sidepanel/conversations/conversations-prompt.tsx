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
import {
  getSlashCommands,
  parseSlashCommand,
} from "@/contexts/conversations/agents/registry";
import type { AgentProfile, AgentProfileId } from "@/contexts/conversations/agents/types";
import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MousePointerClick, XIcon } from "lucide-react";
import { ChatModelSelectorTrigger } from "../components/chat-model-selector";
import { useHistoryNavigation } from "./use-history-navigation";

interface Props {
  status: ChatStatus;
  messages: UIMessage[];
  onSend: (text: string, profile: AgentProfileId) => void;
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

function SlashCommandMenu({
  commands,
  onSelect,
}: {
  commands: AgentProfile[];
  onSelect: (command: string) => void;
}) {
  return (
    <div className="absolute bottom-full left-4 right-4 z-50 mb-2 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        Agent Commands
      </p>
      {commands.map((cmd) => (
        <button
          key={cmd.id}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
          onClick={() => onSelect(cmd.command!)}
          type="button"
        >
          <span className="min-w-16 font-medium text-primary">
            {cmd.label}
          </span>
          <span className="truncate text-muted-foreground">
            {cmd.description}
          </span>
        </button>
      ))}
    </div>
  );
}

export const ConversationsPrompt = ({ status, messages, onSend, onStop }: Props) => {
  const [text, setText] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode, pendingSelection, clearPendingSelection } =
    useConversations();
  const {
    selections,
    isPicking,
    startPicker,
    stopPicker,
    remove,
    clear: clearSelections,
  } = useDomSelections();

  const userTexts = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user")
        .map((m) =>
          m.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join(""),
        )
        .filter((t) => t.trim()),
    [messages],
  );

  const { navigateUp, navigateDown, reset } = useHistoryNavigation(userTexts);

  const slashCommands = useMemo(() => getSlashCommands(), []);
  const slashQuery =
    mode === "agent" &&
    text.startsWith("/") &&
    !text.includes(" ")
      ? text.slice(1).toLowerCase()
      : null;
  const filteredCommands = useMemo(
    () =>
      slashQuery !== null
        ? slashCommands.filter((c) => c.command!.startsWith(slashQuery))
        : [],
    [slashCommands, slashQuery],
  );
  const showSlashMenu = slashQuery !== null && filteredCommands.length > 0;

  const selectCommand = (command: string) => {
    setText(`/${command} `);
  };

  const handleSubmit = (message: PromptInputMessage) => {
    let content = message.text.trim();
    let profile: AgentProfileId = "default";

    if (mode === "agent") {
      const parsed = parseSlashCommand(content);
      if (parsed) {
        profile = parsed.profile;
      }
    }

    // Allow bare slash commands (e.g. /index) to fire with no extra text;
    // only bail when there's nothing to send AND no command was invoked.
    if (
      !content &&
      !pendingSelection &&
      selections.length === 0 &&
      profile === "default"
    ) {
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

    onSend(final, profile);
    reset();
    setText("");
  };

  const handleHistoryKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "ArrowUp") {
        const beforeCursor = e.currentTarget.value.substring(
          0,
          e.currentTarget.selectionStart ?? 0,
        );
        if (beforeCursor.includes("\n")) return;
        const value = navigateUp(e.currentTarget.value);
        if (value !== null) {
          e.preventDefault();
          setText(value);
          const el = textareaRef.current;
          if (el) {
            requestAnimationFrame(() =>
              el.setSelectionRange(value.length, value.length),
            );
          }
        }
      }

      if (e.key === "ArrowDown") {
        const afterCursor = e.currentTarget.value.substring(
          e.currentTarget.selectionEnd ?? 0,
        );
        if (afterCursor.includes("\n")) return;
        const value = navigateDown();
        if (value !== null) {
          e.preventDefault();
          setText(value);
          const el = textareaRef.current;
          if (el) {
            requestAnimationFrame(() =>
              el.setSelectionRange(value.length, value.length),
            );
          }
        }
      }
    },
    [navigateUp, navigateDown],
  );

  return (
    <div className="grid shrink-0 gap-4 pt-4">
      <div className="relative w-full px-4 pb-4">
        {showSlashMenu && (
          <SlashCommandMenu
            commands={filteredCommands}
            onSelect={selectCommand}
          />
        )}
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
              onChange={(e) => {
                setText(e.target.value);
                reset();
              }}
              onKeyDown={handleHistoryKeyDown}
              placeholder={
                mode === "agent"
                  ? "Type / for commands, or ask anything..."
                  : "Send a message..."
              }
              ref={textareaRef}
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
