import type { Plugin } from "@opencode-ai/plugin";
import { ZeroburnGovernor } from "@zeroburn/core";

export interface ZeroburnOpenCodeOptions {
  sessionBudgetUsd?: number;
}

export const createZeroburnOpenCodePlugin = (
  options: ZeroburnOpenCodeOptions = {},
): Plugin => {
  return async () => {
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

    return {
      "tool.execute.before": async () => {
        const decision = governor.evaluate();

        if (!decision.allowed) {
          throw new Error(decision.reason);
        }
      },
    };
  };
};

export const ZeroburnOpenCodePlugin = createZeroburnOpenCodePlugin();
