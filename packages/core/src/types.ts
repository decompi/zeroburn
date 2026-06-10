import type { GovernanceEvent, ToolKind } from "./events.js";

export type CurrencyCode = "USD" | (string & {});

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface GovernorLimits {
  sessionBudget?: Money;
}

export interface UsageSample {
  cost: Money;
  at?: Date;
  source?: string;
}

export interface WasteSignal {
  kind: "broad-glob" | "truncated-tool-output";
  severity: "info" | "warning";
  message: string;
  eventType: GovernanceEvent["type"];
  tool: ToolKind;
  callID: string;
  details?: Record<string, unknown>;
}

export type GovernanceDecision =
  | {
      allowed: true;
      reason?: string;
      remainingSessionBudget?: Money;
      wasteSignals?: WasteSignal[];
    }
  | {
      allowed: false;
      reason: string;
      remainingSessionBudget?: Money;
      wasteSignals?: WasteSignal[];
    };
