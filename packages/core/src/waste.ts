import type { GovernanceEvent } from "./events.js";
import type { SessionGovernanceSnapshot } from "./session.js";
import type { WasteSignal } from "./types.js";

export const detectWasteSignals = (
  event: GovernanceEvent,
  session?: SessionGovernanceSnapshot,
): WasteSignal[] => {
  const signals: WasteSignal[] = [];

  if (event.tool === "glob" && getPattern(event.args) === "**/*") {
    signals.push({
      kind: "broad-glob",
      severity: "warning",
      message: "Broad glob pattern can pull excessive repository context.",
      eventType: event.type,
      tool: event.tool,
      callID: event.callID,
      details: {
        pattern: "**/*",
      },
    });
  }

  if (
    event.type === "tool.execution.completed" &&
    getBooleanMetadata(event.metadata, "truncated")
  ) {
    signals.push({
      kind: "truncated-tool-output",
      severity: "warning",
      message: "Tool output was truncated, which can indicate broad or wasteful exploration.",
      eventType: event.type,
      tool: event.tool,
      callID: event.callID,
      details: {
        outputLength: event.outputLength,
      },
    });
  }

  if (session && session.broadExplorationCount >= 2) {
    signals.push({
      kind: "broad-exploration-sequence",
      severity: "warning",
      message: "Session has repeated broad exploration; compress context before continuing.",
      eventType: event.type,
      tool: event.tool,
      callID: event.callID,
      details: {
        broadExplorationCount: session.broadExplorationCount,
        phase: session.phase,
      },
    });
  }

  if (session && session.repeatedActionCount > 0) {
    signals.push({
      kind: "repeated-tool-action",
      severity: "warning",
      message: "Session is repeating the same tool action, which can indicate a wasteful loop.",
      eventType: event.type,
      tool: event.tool,
      callID: event.callID,
      details: {
        repeatedActionCount: session.repeatedActionCount,
        phase: session.phase,
      },
    });
  }

  if (session && session.totalOutputLength >= 16_000) {
    signals.push({
      kind: "raw-context-volume",
      severity: "warning",
      message: "Session has accumulated large raw tool output; compress context before heavy reasoning.",
      eventType: event.type,
      tool: event.tool,
      callID: event.callID,
      details: {
        totalOutputLength: session.totalOutputLength,
        truncatedOutputCount: session.truncatedOutputCount,
        phase: session.phase,
      },
    });
  }

  return signals;
};

const getPattern = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return typeof value.pattern === "string" ? value.pattern : undefined;
};

const getBooleanMetadata = (value: unknown, key: string): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return value[key] === true;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
