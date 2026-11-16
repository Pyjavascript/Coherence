// Subscription plans shown in the plans dialog (components/PlansModal.jsx).
// Each card's title is `name` over `kind`, `chip` is the small label in its
// top-right corner (icon + tone), and `cta` is its button's label. Prices are
// USD per month; billed yearly, every plan is ANNUAL_DISCOUNT % off.
//
// PLACEHOLDERS: names, prices and limits here are not wired to billing yet.
// Checkout isn't connected, so choosing a plan only shows a toast (App.jsx).

export const FREE_PLAN = {
  name: "Free",
  summary: "40 generations a day, 2 brands and 5 free hooks.",
};

export const ANNUAL_DISCOUNT = 20; // percent off on the yearly plan

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    kind: "Automation",
    chip: { label: "Most Popular", icon: "flame", tone: "green" },
    tagline: "For small teams beginning their journey",
    monthly: 499,
    cta: "Enquire",
  },
  {
    id: "growth",
    name: "Growth",
    kind: "Automation",
    chip: { label: "Most Popular", icon: "flame", tone: "orange" },
    tagline: "For scaling businesses",
    monthly: 1199,
    featured: true,
    cta: "Buy",
  },
];

// The per-month price for a billing period, in dollars (cents kept: 399.2).
export const priceFor = (plan, billing) =>
  billing === "yearly" ? Math.round(plan.monthly * (100 - ANNUAL_DISCOUNT)) / 100 : plan.monthly;

// How much the yearly plan saves, in percent.
export const yearlySaving = () => ANNUAL_DISCOUNT;
