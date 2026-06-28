import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";
import { useState } from "react";
import { ChatModelSelectorTrigger } from "../components/chat-model-selector";

interface Props {
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop: () => void;
}

export const ConversationsPrompt = ({ status, onSend, onStop }: Props) => {
  const [text, setText] = useState<string>("");

  const handleSubmit = (message: PromptInputMessage) => {
    const content = message.text.trim();
    if (!content) {
      return;
    }
    onSend(content);
    setText("");
  };

  return (
    <div className="grid shrink-0 gap-4 pt-4">
      <div className="w-full px-4 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setText(e.target.value)}
              placeholder="Send a message..."
              value={text}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <ChatModelSelectorTrigger
                onlyIcon
                size="icon-sm"
                variant="ghost"
              />
            </PromptInputTools>
            <PromptInputSubmit
              disabled={status === "ready" && !text.trim()}
              onStop={onStop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
