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
      // OpenCode schema: session(id, directory, title, time_created, ...)
      const rows = this.db
        .query("SELECT id, directory FROM session ORDER BY time_created DESC")
        .all() as Array<{ id: string; directory: string }>;

      return rows.map((row) => ({
        opencodeSessionId: row.id,
        projectPath: row.directory,
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
