import { Database } from "bun:sqlite";
import { logger } from "../logger";
import type { SubTodoUpdate } from "@opencode-cc/shared";

const OPENCODE_DB_PATH =
  process.env.OPENCODE_DB_PATH ??
  `${process.env.HOME}/.local/share/opencode/opencode.db`;

export class OpenCodeSQLiteReader {
  private db: Database | null = null;

  connect(): void {
    try {
      this.db = new Database(OPENCODE_DB_PATH, { readonly: true });
      logger.info(`Connected to opencode SQLite at ${OPENCODE_DB_PATH}`);
    } catch (err) {
      logger.warn(`Could not connect to opencode SQLite: ${err}`);
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
