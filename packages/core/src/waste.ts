import type { GovernanceEvent } from "./events.js";
import type { WasteSignal } from "./types.js";

export const detectWasteSignals = (event: GovernanceEvent): WasteSignal[] => {
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
