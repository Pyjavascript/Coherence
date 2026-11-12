import { useId, useState } from "react";
import { CloseBar, useDialogBehavior, useOverlayDismiss } from "./Modal";
import { FREE_PLAN, PLANS, yearlySaving } from "../lib/plans";

// A padlock whose shackle lifts on hover (styles/plans.css).
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="plan-lock-shackle" d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <rect x="5" y="10.5" width="14" height="10" rx="3" fill="currentColor" stroke="none" />
    <path className="plan-lock-hole" d="M12 14.6v2" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5.5 12.5 4 4 9-9" />
  </svg>
);

// The small coloured glyph in each card's corner chip (lib/plans.js chip.icon).
const CHIP_ICONS = {
  drop: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="plan-chip-icon is-drop">
      <path fill="currentColor" d="M12 2.8c-.3 0-.6.2-.8.4C9.4 5.6 5.5 10.6 5.5 14.4a6.5 6.5 0 0 0 13 0c0-3.8-3.9-8.8-5.7-11.2a1 1 0 0 0-.8-.4Z" />
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="plan-chip-icon is-flame">
      <path fill="currentColor" d="M13.2 2.2c.3 3-1.4 4.6-2.9 6.2-1.6 1.6-3.3 3.3-3.3 6.2A5.8 5.8 0 0 0 12.8 21c3.3 0 5.7-2.6 5.7-5.9 0-2.4-1.1-4-2.2-5.2-.2 1.3-.9 2.3-1.9 2.6.6-3.7-.4-7.4-1.2-10.3Z" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="plan-chip-icon is-spark">
      <path fill="currentColor" d="M12 2.5c.4 0 .7.3.8.7l1 4.4a4 4 0 0 0 2.9 2.9l4.4 1c.4.1.7.4.7.8s-.3.7-.7.8l-4.4 1a4 4 0 0 0-2.9 2.9l-1 4.4c-.1.4-.4.7-.8.7s-.7-.3-.8-.7l-1-4.4a4 4 0 0 0-2.9-2.9l-4.4-1a.8.8 0 0 1-.7-.8c0-.4.3-.7.7-.8l4.4-1a4 4 0 0 0 2.9-2.9l1-4.4c.1-.4.4-.7.8-.7Z" />
    </svg>
  ),
};

// The gold "Pro" button in the stage's bottom-left corner (phones: before the
// "?" and Generate), shown on the free plan. Opens the plans dialog.
export function PlanProButton({ onClick }) {
  return (
    <button type="button" className="plan-pro" onClick={onClick} aria-label="See plans" title="You're on the free plan. See plans">
      Pro
    </button>
  );
}

// The plans dialog: a light-blue tray with a Monthly | Yearly switch and three
// plan cards, the middle (featured) one white. Each card: an icon tile and a
// chip, a two-line title, the price, a full-width navy button, then features.
// onChoose(plan, billing) runs when a plan's button is pressed.
export default function PlansModal({ onClose, onChoose }) {
  const titleId = useId();
  // Focus starts on the close button (first in the dialog): focusing a plan
  // button would scroll a phone's stacked cards past the heading.
  const panelRef = useDialogBehavior(onClose);
  const dismiss = useOverlayDismiss(onClose);
  const [billing, setBilling] = useState("monthly");
  // The switch promises the smallest saving, so it holds for every plan.
  const saving = Math.min(...PLANS.map(yearlySaving));

  return (
    <div className="overlay plans-overlay" {...dismiss}>
      <section ref={panelRef} className="plans-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-head">
          <h3 id={titleId}>Unlock the full studio</h3>
          <button type="button" aria-label="Close plans" onClick={onClose}><CloseBar /></button>
        </div>
        <p className="plans-subtitle">More generations, every style pack and extra variants. Cancel anytime.</p>

        <div className="plans-billing" role="radiogroup" aria-label="Billing period" data-billing={billing}>
          <span className="plans-billing-thumb" aria-hidden="true" />
          {["monthly", "yearly"].map((period) => (
            <button
              key={period}
              type="button"
              role="radio"
              aria-checked={billing === period}
              onClick={() => setBilling(period)}
            >
              {period === "monthly" ? "Monthly" : "Yearly"}
              {period === "yearly" && <span className="plans-billing-save">−{saving}%</span>}
            </button>
          ))}
        </div>

        <ul className="plans-grid">
          {PLANS.map((plan, index) => {
            const price = billing === "yearly" ? plan.yearly : plan.monthly;
            return (
              <li
                key={plan.id}
                className={"plan-card" + (plan.featured ? " is-featured" : "")}
                style={{ "--plan-i": index }}
                data-plan={plan.id}
              >
                <div className="plan-top">
                  <span className="plan-icon" aria-hidden="true" />
                  <span className="plan-chip">
                    {CHIP_ICONS[plan.chip.icon]}
                    {plan.chip.label}
                  </span>
                </div>
                <h4 className="plan-name">
                  {plan.name}
                  <br />
                  {plan.kind}
                </h4>
                <p className="plan-tagline">{plan.tagline}</p>
                <div className="plan-price">
                  {/* key: the number replays its swap animation when it changes */}
                  <span key={price} className="plan-price-amount">${price}.00</span>
                  <span className="plan-price-period">/Mo</span>
                </div>
                <p className="plan-billed">
                  {billing === "yearly" ? `$${plan.yearly * 12} billed yearly` : "Billed monthly"}
                </p>
                <button
                  type="button"
                  className="plan-cta"
                  onClick={() => onChoose?.(plan, billing)}
                >
                  Get {plan.name}
                </button>
                <ul className="plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span className="plan-check"><CheckIcon /></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <p className="plans-foot">
          <span className="plans-foot-lock"><LockIcon /></span>
          <span>You're on <b>{FREE_PLAN.name}</b>: {FREE_PLAN.summary}</span>
        </p>
      </section>
    </div>
  );
}
