import type { PlanCode } from "./database.types";

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  priceInr: number;
  billingPeriod: "month" | "one-time";
  noticesPerMonth: number | "unlimited";
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    code: "free_trial",
    name: "Free Trial",
    priceInr: 0,
    billingPeriod: "month",
    noticesPerMonth: 3,
    description: "Try it on a real notice before you decide anything.",
    features: [
      "3 notice drafts, no card required",
      "GST and Income Tax notice types",
      "Editable draft, export as Word",
    ],
  },
  {
    code: "starter",
    name: "Starter",
    priceInr: 999,
    billingPeriod: "month",
    noticesPerMonth: 15,
    description: "For a solo practice handling a steady but modest notice load.",
    features: [
      "15 notice drafts per month",
      "GST, Income Tax, TDS notice types",
      "Draft history and client tagging",
      "Export as Word or PDF",
    ],
    highlighted: true,
  },
  {
    code: "professional",
    name: "Professional",
    priceInr: 2499,
    billingPeriod: "month",
    noticesPerMonth: "unlimited",
    description: "For firms handling notices across many clients every month.",
    features: [
      "Unlimited notice drafts",
      "All notice types, priority processing",
      "Draft history and client tagging",
      "Export as Word or PDF",
      "Priority email support",
    ],
  },
];

export function getPlan(code: PlanCode): PlanDefinition {
  const plan = PLANS.find((p) => p.code === code);
  if (!plan) throw new Error(`Unknown plan code: ${code}`);
  return plan;
}

// Shared card coloring — Free Trial and Professional are blue, Starter is
// yellow. Defined once here so the landing page's pricing preview and the
// dedicated /pricing page can never drift out of sync with each other again.
export const PLAN_CARD_THEME: Record<
  PlanCode,
  { card: string; text: string; subtext: string; feature: string; button: string }
> = {
  free_trial: {
    card: "bg-ink-900",
    text: "text-paper",
    subtext: "text-paper/70",
    feature: "text-brass-light",
    button: "bg-brass text-ink-950 hover:bg-brass-light",
  },
  starter: {
    card: "bg-brass",
    text: "text-ink-950",
    subtext: "text-ink-950/70",
    feature: "text-ink-900",
    button: "bg-ink-950 text-paper hover:bg-ink-900",
  },
  professional: {
    card: "bg-ink-900",
    text: "text-paper",
    subtext: "text-paper/70",
    feature: "text-brass-light",
    button: "bg-brass text-ink-950 hover:bg-brass-light",
  },
};
