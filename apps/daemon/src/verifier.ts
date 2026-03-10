import { logger } from "./logger";
import type { ExportResult } from "./opencode/exporter";

export interface VerificationOutcome {
  passed: boolean;
  type: string;
  buildOutput?: string;
  llmVerdict?: string;
  llmNotes?: string;
}

export class TaskVerifier {
  private opencodeBin: string;

  constructor(opencodeBin: string) {
    this.opencodeBin = opencodeBin;
  }

  async verify(
    config: { type: string; command?: string },
    projectPath: string,
    taskResult: ExportResult
  ): Promise<VerificationOutcome> {
    switch (config.type) {
      case "NONE":
        return { passed: true, type: "NONE" };
      case "BUILD":
        return this.runBuildCheck(config.command ?? "exit 0", projectPath);
      case "LLM":
        return this.runLlmReview(projectPath, taskResult);
      case "BUILD_AND_LLM": {
        const buildResult = await this.runBuildCheck(
          config.command ?? "exit 0",
          projectPath
        );
        if (!buildResult.passed) return buildResult;
        return this.runLlmReview(projectPath, taskResult);
      }
      default:
        logger.warn(`Unknown verification type: ${config.type}, skipping`);
        return { passed: true, type: config.type };
    }
  }

  private async runBuildCheck(
    command: string,
    cwd: string
  ): Promise<VerificationOutcome> {
    logger.info(`Running build verification: ${command} in ${cwd}`);

    try {
      const parts = command.split(" ");
      const proc = Bun.spawn(parts, {
        stdout: "pipe",
        stderr: "pipe",
        cwd,
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      const output = (stdout + "\n" + stderr).trim();
      const passed = exitCode === 0;

      logger.info(
        `Build verification ${passed ? "passed" : "failed"} (exit ${exitCode})`
      );

      return {
        passed,
        type: "BUILD",
        buildOutput: output.slice(0, 5000),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`Build verification error: ${error}`);
      return {
        passed: false,
        type: "BUILD",
        buildOutput: `Error running build command: ${error}`,
      };
    }
  }

  private async runLlmReview(
    projectPath: string,
    result: ExportResult
  ): Promise<VerificationOutcome> {
    logger.info("Running LLM verification review");

    const filesDesc = result.filesChanged
      .map((f) => `- ${f.path} (${f.status})`)
      .join("\n");

    const reviewPrompt = `Review this task completion and determine if it was done correctly.

Summary: ${result.summary}

Files changed:
${filesDesc || "None reported"}

Respond with exactly one line: PASS or FAIL, followed by a brief explanation.`;

    try {
      const proc = Bun.spawn(
        [this.opencodeBin, "run", reviewPrompt, "--cwd", projectPath],
        {
          stdout: "pipe",
          stderr: "pipe",
          cwd: projectPath,
        }
      );

      const output = await new Response(proc.stdout).text();
      await proc.exited;

      const trimmed = output.trim();
      const firstLine = trimmed.split("\n")[0] ?? "";
      const passed = firstLine.toUpperCase().startsWith("PASS");
      const notes = trimmed;

      logger.info(`LLM verification: ${passed ? "PASS" : "FAIL"}`);

      return {
        passed,
        type: "LLM",
        llmVerdict: passed ? "PASS" : "FAIL",
        llmNotes: notes.slice(0, 3000),
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.error(`LLM verification error: ${error}`);
      return {
        passed: false,
        type: "LLM",
        llmVerdict: "ERROR",
        llmNotes: `Error running LLM review: ${error}`,
      };
    }
  }
}
