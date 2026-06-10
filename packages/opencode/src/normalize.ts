import type {
  ToolExecutionCompletedEvent,
  ToolExecutionStartedEvent,
} from "@zeroburn/core";

export const normalizeToolStartedEvent = (
  input: {
    tool: string;
    sessionID: string;
    callID: string;
  },
  output: {
    args: unknown;
  },
): ToolExecutionStartedEvent => {
  return {
    type: "tool.execution.started",
    at: new Date(),
    source: "opencode",
    sessionID: input.sessionID,
    callID: input.callID,
    tool: input.tool,
    args: output.args,
  };
};

export const normalizeToolCompletedEvent = (
  input: {
    tool: string;
    sessionID: string;
    callID: string;
    args: unknown;
  },
  output: {
    title: string;
    output: string;
    metadata: unknown;
  },
): ToolExecutionCompletedEvent => {
  return {
    type: "tool.execution.completed",
    at: new Date(),
    source: "opencode",
    sessionID: input.sessionID,
    callID: input.callID,
    tool: input.tool,
    args: input.args,
    title: output.title,
    outputLength: output.output.length,
    metadata: output.metadata,
  };
};
