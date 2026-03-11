import { Database } from "bun:sqlite";
import { logger } from "../logger";
import type { SubTodoUpdate } from "@opencode-cc/shared";

export interface DiscoveredSession {
  opencodeSessionId: string;
  projectPath: string;
  title?: string;
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
        .query("SELECT id, directory, title FROM session ORDER BY time_created DESC")
        .all() as Array<{ id: string; directory: string; title: string | null }>;

      return rows.map((row) => ({
        opencodeSessionId: row.id,
        projectPath: row.directory,
        title: row.title ?? undefined,
      }));
    } catch (err) {
      logger.warn(`Failed to discover sessions from SQLite: ${err}`);
      return [];
    }
  }

  /**
   * Get the title of a specific session by its OpenCode session ID.
   */
  getSessionTitle(sessionId: string): string | null {
    if (!this.db) return null;
    try {
      const row = this.db
        .query("SELECT title FROM session WHERE id = ?")
        .get(sessionId) as { title: string | null } | null;
      return row?.title ?? null;
    } catch (err) {
      logger.warn(`Failed to get session title for ${sessionId}: ${err}`);
      return null;
    }
  }

  /**
   * Get all sessions with their titles, directories, and creation times.
   */
  getAllSessionsWithTitles(): Array<{
    id: string;
    title?: string;
    directory: string;
    timeCreated: string;
  }> {
    if (!this.db) return [];
    try {
      const rows = this.db
        .query(
          "SELECT id, title, directory, time_created FROM session ORDER BY time_created DESC"
        )
        .all() as Array<{
        id: string;
        title?: string;
        directory: string;
        time_created: string;
      }>;

      return rows.map((row) => ({
        id: row.id,
        title: row.title ?? undefined,
        directory: row.directory,
        timeCreated: row.time_created,
      }));
    } catch (err) {
      logger.warn(`Failed to get sessions with titles: ${err}`);
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
