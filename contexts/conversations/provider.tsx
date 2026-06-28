import { useLiveQuery } from "dexie-react-hooks";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createSession as createSessionRow,
  deleteSession as deleteSessionRow,
  listSessions,
  loadMessages,
  renameSession as renameSessionRow,
} from "@/lib/conversations/store";
import { ConversationsContext, type ActiveSession, type ConversationsContextValue } from "./core";

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const sessions = useLiveQuery(() => listSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<UIMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isSessionsOpen, setSessionsOpen] = useState(false);
  const didInit = useRef(false);

  const activate = useCallback((id: string, messages: UIMessage[]) => {
    setActiveSessionId(id);
    setActiveMessages(messages);
  }, []);

  // Initial load: pick the most recent session, or create one if none exists.
  useEffect(() => {
    if (didInit.current || sessions === undefined) return;
    didInit.current = true;
    void (async () => {
      if (sessions.length === 0) {
        const s = await createSessionRow();
        activate(s.id, []);
      } else {
        const msgs = await loadMessages(sessions[0].id);
        activate(sessions[0].id, msgs);
      }
      setIsReady(true);
    })();
  }, [sessions, activate]);

  const newSession = useCallback(async () => {
    const s = await createSessionRow();
    activate(s.id, []);
  }, [activate]);

  const selectSession = useCallback(
    async (id: string) => {
      const msgs = await loadMessages(id);
      activate(id, msgs);
    },
    [activate],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await deleteSessionRow(id);
      if (id !== activeSessionId) return;
      const remaining = await listSessions();
      if (remaining.length === 0) {
        const s = await createSessionRow();
        activate(s.id, []);
      } else {
        const msgs = await loadMessages(remaining[0].id);
        activate(remaining[0].id, msgs);
      }
    },
    [activeSessionId, activate],
  );

  const renameSession = useCallback(async (id: string, title: string) => {
    await renameSessionRow(id, title);
  }, []);

  const activeSession = useMemo<ActiveSession | null>(() => {
    if (activeSessionId === null) return null;
    return { id: activeSessionId, messages: activeMessages };
  }, [activeSessionId, activeMessages]);

  const value = useMemo<ConversationsContextValue>(
    () => ({
      sessions: sessions ?? [],
      activeSession,
      isReady,
      newSession,
      selectSession,
      deleteSession,
      renameSession,
      isSessionsOpen,
      openSessions: () => setSessionsOpen(true),
      closeSessions: () => setSessionsOpen(false),
    }),
    [
      sessions,
      activeSession,
      isReady,
      newSession,
      selectSession,
      deleteSession,
      renameSession,
      isSessionsOpen,
    ],
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}
