import type { Plugin } from "@opencode-ai/plugin";
import { ZeroburnGovernor } from "@zeroburn/core";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface ZeroburnOpenCodeOptions {
  sessionBudgetUsd?: number;
}

const createLogger = (directory: string) => {
  const logPath = join(directory, ".opencode", "zeroburn.log");

  return (event: string, data: Record<string, unknown>) => {
    mkdirSync(join(directory, ".opencode"), { recursive: true });
    appendFileSync(
      logPath,
      `${JSON.stringify({ at: new Date().toISOString(), event, ...data })}\n`,
    );
  };
};

export const createZeroburnOpenCodePlugin = (
  options: ZeroburnOpenCodeOptions = {},
): Plugin => {
  return async (input) => {
    const log = createLogger(input.worktree);
    const governor = new ZeroburnGovernor(
      options.sessionBudgetUsd === undefined
        ? undefined
        : {
            sessionBudget: {
              amount: options.sessionBudgetUsd,
              currency: "USD",
            },
          },
    );

    log("plugin.loaded", {
      directory: input.directory,
      worktree: input.worktree,
      sessionBudgetUsd: options.sessionBudgetUsd ?? null,
    });

    return {
      "tool.execute.before": async (hookInput, hookOutput) => {
        const decision = governor.evaluate();

        log("tool.execute.before", {
          tool: hookInput.tool,
          sessionID: hookInput.sessionID,
          callID: hookInput.callID,
          args: hookOutput.args,
          decision,
        });

        if (!decision.allowed) {
          throw new Error(decision.reason);
        }
      },
      "tool.execute.after": async (hookInput, hookOutput) => {
        log("tool.execute.after", {
          tool: hookInput.tool,
          sessionID: hookInput.sessionID,
          callID: hookInput.callID,
          title: hookOutput.title,
          outputLength: hookOutput.output.length,
          metadata: hookOutput.metadata,
        });
      },
    };
  };
};

export const ZeroburnOpenCodePlugin = createZeroburnOpenCodePlugin();

export default ZeroburnOpenCodePlugin;
