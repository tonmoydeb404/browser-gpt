import { useMemo, type ReactNode } from "react";
import {
  ConversationsContext,
  type ConversationsContextValue,
} from "./core";
import { usePendingSelection } from "./hooks/use-pending-selection";
import { useSessions } from "./hooks/use-sessions";

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const sessions = useSessions();
  const { selection, clearSelection } = usePendingSelection();

  const value = useMemo<ConversationsContextValue>(
    () => ({
      ...sessions,
      pendingSelection: selection,
      clearPendingSelection: clearSelection,
    }),
    [sessions, selection, clearSelection],
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}
