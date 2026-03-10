import { Database } from "bun:sqlite";
import { logger } from "../logger";
import type { SubTodoUpdate } from "@opencode-cc/shared";

export interface DiscoveredSession {
  opencodeSessionId: string;
  projectPath: string;
}

export class OpenCodeSQLiteReader {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  connect(): void {
    try {
      this.db = new Database(this.dbPath, { readonly: true });
      logger.info(`Connected to opencode SQLite at ${this.dbPath}`);
    } catch (err) {
      logger.warn(`Could not connect to opencode SQLite: ${err}`);
    }
  }

  discoverSessions(): DiscoveredSession[] {
    if (!this.db) return [];
    try {
      // OpenCode stores sessions with id and path fields
      const rows = this.db
        .query("SELECT id, path FROM session ORDER BY created_at DESC")
        .all() as Array<{ id: string; path: string }>;

      return rows.map((row) => ({
        opencodeSessionId: row.id,
        projectPath: row.path,
      }));
    } catch (err) {
      logger.warn(`Failed to discover sessions from SQLite: ${err}`);
      return [];
    }
  }

  getSubTodos(sessionId: string): SubTodoUpdate[] {
    if (!this.db) return [];
    try {
      const rows = this.db
        .query(
          "SELECT content, status, position FROM todo WHERE session_id = ? ORDER BY position"
        )
        .all(sessionId) as Array<{
        content: string;
        status: string;
        position: number;
      }>;

      return rows.map((row) => ({
        content: row.content,
        checked: row.status === "completed" || row.status === "done",
        position: row.position,
      }));
    } catch (err) {
      logger.warn(`Failed to read subtodos for session ${sessionId}: ${err}`);
      return [];
    }
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }
}
