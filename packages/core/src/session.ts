import type { GovernanceEvent, ToolKind } from "./events.js";

export type SessionPhase =
  | "exploration"
  | "implementation"
  | "validation"
  | "debugging";

export interface SessionGovernanceSnapshot {
  sessionID: string;
  phase: SessionPhase;
  eventCount: number;
  toolCounts: Partial<Record<ToolKind, number>>;
  broadExplorationCount: number;
  repeatedActionCount: number;
  totalOutputLength: number;
  truncatedOutputCount: number;
}

export class SessionGovernanceState {
  readonly sessionID: string;

  #events: GovernanceEvent[] = [];
  #toolCounts = new Map<ToolKind, number>();
  #actionCounts = new Map<string, number>();
  #broadExplorationCount = 0;
  #repeatedActionCount = 0;
  #totalOutputLength = 0;
  #truncatedOutputCount = 0;

  constructor(sessionID: string) {
    this.sessionID = sessionID;
  }

  record(event: GovernanceEvent): SessionGovernanceSnapshot {
    this.#events.push(event);

    if (event.type === "tool.execution.started") {
      this.#toolCounts.set(event.tool, (this.#toolCounts.get(event.tool) ?? 0) + 1);

      if (isBroadExploration(event)) {
        this.#broadExplorationCount += 1;
      }

      const actionKey = getActionKey(event);
      const actionCount = (this.#actionCounts.get(actionKey) ?? 0) + 1;
      this.#actionCounts.set(actionKey, actionCount);

      if (actionCount >= 3) {
        this.#repeatedActionCount += 1;
      }
    }

    if (event.type === "tool.execution.completed") {
      this.#totalOutputLength += event.outputLength;

      if (hasBooleanMetadata(event.metadata, "truncated")) {
        this.#truncatedOutputCount += 1;
      }
    }

    return this.snapshot();
  }

  snapshot(): SessionGovernanceSnapshot {
    return {
      sessionID: this.sessionID,
      phase: this.getPhase(),
      eventCount: this.#events.length,
      toolCounts: Object.fromEntries(this.#toolCounts),
      broadExplorationCount: this.#broadExplorationCount,
      repeatedActionCount: this.#repeatedActionCount,
      totalOutputLength: this.#totalOutputLength,
      truncatedOutputCount: this.#truncatedOutputCount,
    };
  }

  private getPhase(): SessionPhase {
    const validationCount =
      (this.#toolCounts.get("bash") ?? 0) + (this.#toolCounts.get("test") ?? 0);
    const implementationCount =
      (this.#toolCounts.get("edit") ?? 0) +
      (this.#toolCounts.get("write") ?? 0) +
      (this.#toolCounts.get("apply_patch") ?? 0);

    if (validationCount >= 3 && implementationCount > 0) {
      return "debugging";
    }

    if (validationCount > 0 && implementationCount > 0) {
      return "validation";
    }

    if (implementationCount > 0) {
      return "implementation";
    }

    return "exploration";
  }
}

const isBroadExploration = (event: GovernanceEvent): boolean => {
  if (event.tool === "glob") {
    const pattern = getStringArg(event.args, "pattern");
    return pattern === "**/*" || pattern === "**";
  }

  if (event.tool === "grep") {
    const pattern = getStringArg(event.args, "pattern");
    return pattern === "" || pattern === "." || pattern === "*";
  }

  return false;
};

const getActionKey = (event: GovernanceEvent): string => {
  return `${event.type}:${event.tool}:${stableStringify(event.args)}`;
};

const getStringArg = (value: unknown, key: string): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return typeof value[key] === "string" ? value[key] : undefined;
};

const hasBooleanMetadata = (value: unknown, key: string): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return value[key] === true;
};

const stableStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, Object.keys(flattenRecordKeys(value)).sort());
  } catch {
    return String(value);
  }
};

const flattenRecordKeys = (value: unknown): Record<string, true> => {
  if (!isRecord(value)) {
    return {};
  }

  const keys: Record<string, true> = {};
  for (const key of Object.keys(value)) {
    keys[key] = true;
  }

  return keys;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
