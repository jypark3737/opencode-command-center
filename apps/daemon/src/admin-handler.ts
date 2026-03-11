import type { AdminRunCommandMessage, AdminRunResultMessage } from "@opencode-cc/shared";
import { logger } from "./logger";

export class AdminCommandHandler {
  private opencodeBin: string;
  private deviceId: string;

  constructor(opencodeBin: string, deviceId: string) {
    this.opencodeBin = opencodeBin;
    this.deviceId = deviceId;
  }

  async handleCommand(msg: AdminRunCommandMessage): Promise<AdminRunResultMessage> {
    logger.info(`[Admin] Running command for request ${msg.requestId}`);

    const timeoutMs = 5 * 60 * 1000; // 5 minutes
    let timedOut = false;

    try {
      const proc = Bun.spawn(
        [this.opencodeBin, "run", msg.command, ...(msg.projectPath ? ["--cwd", msg.projectPath] : [])],
        {
          stdout: "pipe",
          stderr: "pipe",
          cwd: msg.projectPath ?? process.cwd(),
        }
      );

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        proc.kill();
        logger.warn(`[Admin] Command timed out after ${timeoutMs / 1000}s`);
      }, timeoutMs);

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      clearTimeout(timeoutHandle);

      if (timedOut) {
        return {
          type: "admin_run_result",
          requestId: msg.requestId,
          deviceId: this.deviceId,
          output: "",
          exitCode: 1,
          error: `Command timed out after ${timeoutMs / 1000}s`,
        };
      }

      logger.info(`[Admin] Command completed with exit code ${exitCode}`);

      return {
        type: "admin_run_result",
        requestId: msg.requestId,
        deviceId: this.deviceId,
        output,
        exitCode,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`[Admin] Command error: ${error}`);
      return {
        type: "admin_run_result",
        requestId: msg.requestId,
        deviceId: this.deviceId,
        output: "",
        exitCode: 1,
        error,
      };
    }
  }
}
