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
      event: async (hookInput) => {
        const event = hookInput.event;
        const eventType = event.type as string;

        if (
          eventType === "permission.asked" ||
          eventType === "permission.replied" ||
          eventType === "permission.v2.asked" ||
          eventType === "permission.v2.replied"
        ) {
          log("opencode.capability.permission.event", {
            opencodeEvent: event,
          });
        }
      },
      "chat.message": async (hookInput) => {
        log("opencode.capability.chat.message", {
          sessionID: hookInput.sessionID,
          agent: hookInput.agent ?? null,
          model: hookInput.model ?? null,
          messageID: hookInput.messageID ?? null,
          variant: hookInput.variant ?? null,
        });
      },
      "chat.params": async (hookInput, hookOutput) => {
        log("opencode.capability.chat.params", {
          sessionID: hookInput.sessionID,
          agent: hookInput.agent,
          model: summarizeModel(hookInput.model),
          provider: summarizeProvider(hookInput.provider),
          output: {
            temperature: hookOutput.temperature,
            topP: hookOutput.topP,
            topK: hookOutput.topK,
            maxOutputTokens: hookOutput.maxOutputTokens ?? null,
            optionKeys: Object.keys(hookOutput.options),
          },
        });
      },
      "experimental.provider.small_model": async (hookInput, hookOutput) => {
        log("opencode.capability.small_model", {
          provider: summarizeValue(hookInput.provider),
          currentModel: hookOutput.model ? summarizeValue(hookOutput.model) : null,
          canAssignModel: true,
        });
      },
      "experimental.chat.system.transform": async (hookInput, hookOutput) => {
        log("opencode.capability.system.transform", {
          sessionID: hookInput.sessionID ?? null,
          model: summarizeModel(hookInput.model),
          systemMessageCount: hookOutput.system.length,
        });
      },
      "experimental.session.compacting": async (hookInput, hookOutput) => {
        log("opencode.capability.session.compacting", {
          sessionID: hookInput.sessionID,
          contextCount: hookOutput.context.length,
          hasPrompt: hookOutput.prompt !== undefined,
        });
      },
      "permission.ask": async (hookInput, hookOutput) => {
        log("opencode.capability.permission.ask", {
          permission: summarizeValue(hookInput),
          status: hookOutput.status,
        });
      },
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

const summarizeModel = (model: unknown): Record<string, unknown> => {
  if (!isRecord(model)) {
    return { value: model };
  }

  return {
    id: model.id ?? model.modelID ?? model.name ?? null,
    name: model.name ?? null,
    providerID: model.providerID ?? null,
    family: model.family ?? null,
    status: model.status ?? null,
    cost: model.cost ?? null,
    limit: model.limit ?? null,
    capabilities: model.capabilities ?? null,
    variants: model.variants ?? null,
    keys: Object.keys(model),
  };
};

const summarizeProvider = (provider: unknown): Record<string, unknown> => {
  if (!isRecord(provider)) {
    return { value: provider };
  }

  return {
    source: provider.source ?? null,
    info: summarizeValue(provider.info),
    optionKeys: isRecord(provider.options) ? Object.keys(provider.options) : [],
  };
};

const summarizeValue = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  return {
    id: value.id ?? value.providerID ?? value.modelID ?? value.name ?? null,
    name: value.name ?? null,
    keys: Object.keys(value),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
