// Subscription plans shown in the plans dialog (components/PlansModal.jsx).
// Each card's title is `name` over `kind`, and `chip` is the small label in
// its top-right corner. Prices are USD per month; `yearly` is the per-month price when billed
// yearly. Keep each plan's two prices the same number of digits so the price
// doesn't change width when the billing switch flips.
//
// PLACEHOLDERS: names, prices and limits here are not wired to billing yet.
// Checkout isn't connected, so choosing a plan only shows a toast (App.jsx).

export const FREE_PLAN = {
  name: "Free",
  summary: "40 generations a day, 2 brands and 5 free hooks.",
};

export const PLANS = [
  {
    id: "plus",
    name: "Plus",
    kind: "Essentials",
    chip: { label: "For creators", icon: "drop" },
    tagline: "For solo makers finding their voice.",
    monthly: 9,
    yearly: 7,
    features: [
      "150 generations a day",
      "5 saved brands",
      "Unlimited hooks",
      "2 variants per card",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    kind: "Growth",
    chip: { label: "Most popular", icon: "flame" },
    tagline: "For brands that ship copy every day.",
    monthly: 19,
    yearly: 15,
    featured: true,
    features: [
      "500 generations a day",
      "Unlimited brands",
      "Unlimited hooks",
      "Up to 3 variants per card",
      "All four style packs",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    kind: "Teams",
    chip: { label: "For agencies", icon: "spark" },
    tagline: "For agencies running many brands.",
    monthly: 49,
    yearly: 39,
    features: [
      "Everything in Pro",
      "2,000 generations a day",
      "Priority generation",
      "Priority support",
    ],
  },
];

// How much a year of `yearly` saves over a year of `monthly`, rounded (e.g. 21).
export const yearlySaving = (plan) => Math.round((1 - plan.yearly / plan.monthly) * 100);
