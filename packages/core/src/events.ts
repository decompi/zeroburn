export type ToolKind =
  | "read"
  | "grep"
  | "glob"
  | "bash"
  | "edit"
  | "write"
  | "apply_patch"
  | (string & {});

export interface ToolExecutionStartedEvent {
  type: "tool.execution.started";
  at: Date;
  source: string;
  sessionID: string;
  callID: string;
  tool: ToolKind;
  args?: unknown;
}

export interface ToolExecutionCompletedEvent {
  type: "tool.execution.completed";
  at: Date;
  source: string;
  sessionID: string;
  callID: string;
  tool: ToolKind;
  args?: unknown;
  title?: string;
  outputLength: number;
  metadata?: unknown;
}

export type GovernanceEvent =
  | ToolExecutionStartedEvent
  | ToolExecutionCompletedEvent;
