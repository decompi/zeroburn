import type { GovernanceEvent } from "./events.js";
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
      return { allowed: true };
    }

    const projectedSpend = this.#sessionSpend.amount + (pendingCost?.amount ?? 0);
    const remainingSessionBudget = {
      amount: Math.max(budget.amount - projectedSpend, 0),
      currency: budget.currency,
    };

    if (projectedSpend > budget.amount) {
      return {
        allowed: false,
        reason: "Session budget exceeded",
        remainingSessionBudget,
      };
    }

    return {
      allowed: true,
      remainingSessionBudget,
    };
  }

  evaluateEvent(event: GovernanceEvent): GovernanceDecision {
    const decision = this.evaluate();
    const wasteSignals = detectWasteSignals(event);

    if (wasteSignals.length === 0) {
      return decision;
    }

    return {
      ...decision,
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
}
