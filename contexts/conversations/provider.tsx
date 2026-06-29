import { useMemo, useState, type ReactNode } from "react";
import type { ChatMode } from "./agents/types";
import {
  ConversationsContext,
  type ConversationsContextValue,
} from "./core";
import { usePendingSelection } from "./hooks/use-pending-selection";
import { useSessions } from "./hooks/use-sessions";

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const sessions = useSessions();
  const { selection, clearSelection } = usePendingSelection();
  const [mode, setMode] = useState<ChatMode>("chat");

  const value = useMemo<ConversationsContextValue>(
    () => ({
      ...sessions,
      pendingSelection: selection,
      clearPendingSelection: clearSelection,
      mode,
      setMode,
    }),
    [sessions, selection, clearSelection, mode],
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}
