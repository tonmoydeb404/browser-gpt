import Dexie, { type EntityTable } from "dexie";
import type { UIMessage } from "ai";

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  seq: number;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
}

export class ConversationDB extends Dexie {
  sessions!: EntityTable<Session, "id">;
  messages!: EntityTable<MessageRow, "id">;

  constructor() {
    super("browser-gpt");
    this.version(1).stores({
      sessions: "id, updatedAt",
      messages: "id, sessionId, [sessionId+seq]",
    });
  }
}

export const db = new ConversationDB();
