import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type Logger = (event: string, data: Record<string, unknown>) => void;

export const createLogger = (directory: string): Logger => {
  const logDirectory = join(directory, ".opencode");
  const logPath = join(directory, ".opencode", "zeroburn.log");

  try {
    mkdirSync(logDirectory, { recursive: true });
  } catch {
    return () => {};
  }

  return (event, data) => {
    try {
      appendFileSync(
        logPath,
        `${JSON.stringify({ at: new Date().toISOString(), event, ...data })}\n`,
      );
    } catch {
      // Logging should never block OpenCode tool execution.
    }
  };
};
