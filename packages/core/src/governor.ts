import type { GovernanceEvent } from "./events.js";
import { SessionGovernanceState } from "./session.js";
import type {
  GovernanceDecision,
  GovernorLimits,
  Money,
  UsageSample,
} from "./types.js";
import { detectWasteSignals } from "./waste.js";

export class ZeroburnGovernor {
  readonly limits: GovernorLimits;

  #sessionSpend: Money;
  #sessions = new Map<string, SessionGovernanceState>();

  constructor(limits: GovernorLimits = {}) {
    this.limits = limits;
    this.#sessionSpend = {
      amount: 0,
      currency: limits.sessionBudget?.currency ?? "USD",
    };
  }

  recordUsage(sample: UsageSample): GovernanceDecision {
    this.assertCompatibleCurrency(sample.cost);

    this.#sessionSpend = {
      amount: this.#sessionSpend.amount + sample.cost.amount,
      currency: this.#sessionSpend.currency,
    };

    return this.evaluate();
  }

  evaluate(pendingCost?: Money): GovernanceDecision {
    if (pendingCost) {
      this.assertCompatibleCurrency(pendingCost);
    }

    const budget = this.limits.sessionBudget;
    if (!budget) {
      return { allowed: true, action: "allow" };
    }

    const projectedSpend = this.#sessionSpend.amount + (pendingCost?.amount ?? 0);
    const remainingSessionBudget = {
      amount: Math.max(budget.amount - projectedSpend, 0),
      currency: budget.currency,
    };

    if (projectedSpend > budget.amount) {
      return {
        allowed: false,
        action: "block",
        reason: "Session budget exceeded",
        remainingSessionBudget,
      };
    }

    return {
      allowed: true,
      action: "allow",
      remainingSessionBudget,
    };
  }

  evaluateEvent(event: GovernanceEvent): GovernanceDecision {
    const decision = this.evaluate();
    const session = this.getSession(event.sessionID);
    const sessionSnapshot = session.record(event);
    const wasteSignals = detectWasteSignals(event, sessionSnapshot);

    if (wasteSignals.length === 0) {
      return {
        ...decision,
        session: sessionSnapshot,
      };
    }

    if (!decision.allowed) {
      return {
        ...decision,
        session: sessionSnapshot,
        wasteSignals,
      };
    }

    return {
      ...decision,
      action: getPolicyAction(wasteSignals),
      session: sessionSnapshot,
      wasteSignals,
    };
  }

  getSessionSpend(): Money {
    return { ...this.#sessionSpend };
  }

  private assertCompatibleCurrency(cost: Money): void {
    if (cost.currency !== this.#sessionSpend.currency) {
      throw new Error(
        `Currency mismatch: expected ${this.#sessionSpend.currency}, received ${cost.currency}`,
      );
    }
  }

  private getSession(sessionID: string): SessionGovernanceState {
    const existing = this.#sessions.get(sessionID);
    if (existing) {
      return existing;
    }

    const session = new SessionGovernanceState(sessionID);
    this.#sessions.set(sessionID, session);
    return session;
  }
}

const getPolicyAction = (
  wasteSignals: NonNullable<GovernanceDecision["wasteSignals"]>,
): Exclude<GovernanceDecision["action"], "block"> => {
  if (
    wasteSignals.some((signal) =>
      ["broad-exploration-sequence", "raw-context-volume"].includes(signal.kind),
    )
  ) {
    return "compress_first";
  }

  return "warn";
};
