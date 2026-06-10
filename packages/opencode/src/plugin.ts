import type { Plugin } from "@opencode-ai/plugin";
import { ZeroburnGovernor } from "@zeroburn/core";
import { createLogger } from "./logger.js";
import {
  normalizeToolCompletedEvent,
  normalizeToolStartedEvent,
} from "./normalize.js";

export interface ZeroburnOpenCodeOptions {
  sessionBudgetUsd?: number;
}

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
        const event = normalizeToolStartedEvent(hookInput, hookOutput);
        const decision = governor.evaluateEvent(event);

        log("governance.event", {
          governanceEvent: event,
          decision,
        });

        if (!decision.allowed) {
          throw new Error(decision.reason);
        }
      },
      "tool.execute.after": async (hookInput, hookOutput) => {
        const event = normalizeToolCompletedEvent(hookInput, hookOutput);
        const decision = governor.evaluateEvent(event);

        log("governance.event", {
          governanceEvent: event,
          decision,
        });
      },
    };
  };
};

export const ZeroburnOpenCodePlugin = createZeroburnOpenCodePlugin();
