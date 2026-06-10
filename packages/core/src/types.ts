import type { GovernanceEvent, ToolKind } from "./events.js";
import type { SessionGovernanceSnapshot } from "./session.js";

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
  kind:
    | "broad-exploration-sequence"
    | "broad-glob"
    | "raw-context-volume"
    | "repeated-tool-action"
    | "truncated-tool-output";
  severity: "info" | "warning";
  message: string;
  eventType: GovernanceEvent["type"];
  tool: ToolKind;
  callID: string;
  details?: Record<string, unknown>;
}

export type PolicyAction =
  | "allow"
  | "warn"
  | "block"
  | "compress_first"
  | "require_confirmation";

export type GovernanceDecision =
  | {
      allowed: true;
      action: Exclude<PolicyAction, "block">;
      reason?: string;
      remainingSessionBudget?: Money;
      session?: SessionGovernanceSnapshot;
      wasteSignals?: WasteSignal[];
    }
  | {
      allowed: false;
      action: "block";
      reason: string;
      remainingSessionBudget?: Money;
      session?: SessionGovernanceSnapshot;
      wasteSignals?: WasteSignal[];
    };
