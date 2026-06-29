import type { UIMessage } from "ai";
import { nanoid } from "nanoid";
import { db, type MessageRow, type Session } from "./db";

export type { Session } from "./db";

const NEW_SESSION_TITLE = "New Chat";
const TITLE_MAX_LENGTH = 48;

function deriveTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return NEW_SESSION_TITLE;
  return trimmed.length > TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, TITLE_MAX_LENGTH)}…`
    : trimmed;
}

function firstUserText(messages: UIMessage[]): string | null {
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const text = msg.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join(" ");
    if (text.trim()) return text;
  }
  return null;
}

export async function listSessions(): Promise<Session[]> {
  return db.sessions.orderBy("updatedAt").reverse().toArray();
}

export async function createSession(): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: nanoid(),
    title: NEW_SESSION_TITLE,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);
  return session;
}

export async function renameSession(id: string, title: string): Promise<void> {
  await db.sessions.update(id, { title });
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction("rw", db.sessions, db.messages, async () => {
    await db.sessions.delete(id);
    await db.messages.where("sessionId").equals(id).delete();
  });
}

export async function loadMessages(sessionId: string): Promise<UIMessage[]> {
  const rows = await db.messages
    .where("[sessionId+seq]")
    .between([sessionId, Number.NEGATIVE_INFINITY], [sessionId, Number.POSITIVE_INFINITY])
    .toArray();
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: row.parts,
  })) as UIMessage[];
}

export async function saveMessages(
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  const now = Date.now();

  await db.transaction("rw", db.sessions, db.messages, async () => {
    await db.messages.where("sessionId").equals(sessionId).delete();

    const rows: MessageRow[] = messages.map((msg, seq) => ({
      id: msg.id,
      sessionId,
      seq,
      role: msg.role,
      parts: msg.parts,
    }));
    if (rows.length > 0) {
      await db.messages.bulkPut(rows);
    }

    const patch: Partial<Session> = { updatedAt: now };
    const firstText = firstUserText(messages);
    if (firstText) {
      const current = await db.sessions.get(sessionId);
      if (current && current.title === NEW_SESSION_TITLE) {
        patch.title = deriveTitle(firstText);
      }
    }
    await db.sessions.update(sessionId, patch);
  });
}
