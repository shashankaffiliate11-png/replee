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
