import type { ChatMode } from "./agents/types";
import type { UIMessage } from "ai";
import { createContext, useContext } from "react";
import type { PendingSelection } from "./selection-store";
import type { Session } from "./session-store";

export interface ActiveSession {
  id: string;
  messages: UIMessage[];
}

export interface ConversationsContextValue {
  sessions: Session[];
  activeSession: ActiveSession | null;
  isReady: boolean;
  newSession: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  isSessionsOpen: boolean;
  openSessions: () => void;
  closeSessions: () => void;

  /** Context-menu text selection awaiting discussion (Feature 1). */
  pendingSelection: PendingSelection | null;
  clearPendingSelection: () => void;

  /** Current chat mode — transient, switchable mid-conversation. */
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export const ConversationsContext =
  createContext<ConversationsContextValue | null>(null);

export function useConversations(): ConversationsContextValue {
  const ctx = useContext(ConversationsContext);
  if (!ctx) {
    throw new Error("useConversations must be used within a ConversationsProvider");
  }
  return ctx;
}
