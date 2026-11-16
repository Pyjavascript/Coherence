import { useId, useState } from "react";
import { CloseBar, useDialogBehavior, useOverlayDismiss } from "./Modal";
import { PLANS, priceFor, yearlySaving } from "../lib/plans";

// The flame in each card's "Most Popular" chip, coloured by the chip's tone
// (lib/plans.js chip.tone): the theme green, or orange on the featured card.
const FlameIcon = ({ tone }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={"plan-chip-icon is-" + (tone || "green")}>
    <path fill="currentColor" d="M13.2 2.2c.3 3-1.4 4.6-2.9 6.2-1.6 1.6-3.3 3.3-3.3 6.2A5.8 5.8 0 0 0 12.8 21c3.3 0 5.7-2.6 5.7-5.9 0-2.4-1.1-4-2.2-5.2-.2 1.3-.9 2.3-1.9 2.6.6-3.7-.4-7.4-1.2-10.3Z" />
  </svg>
);

// The orange "Pro" button in the stage's bottom-left corner (phones: before the
// "?" and Generate), shown on the free plan. Opens the plans dialog.
export function PlanProButton({ onClick }) {
  return (
    <button type="button" className="plan-pro" onClick={onClick} aria-label="See plans" title="You're on the free plan. See plans">
      Pro
    </button>
  );
}

// The plans dialog ("Flexible Plans"): a white sheet with the heading, a light
// green tray with the two plans side by side (the featured one on a white
// card), then the annual saving and a Monthly | Yearly switch. Each plan: an
// icon and a chip, a two-line title, a tagline, the price per month and a
// full-width button. onChoose(plan, billing) runs when a plan's button is
// pressed. Styles: styles/plans.css.
export default function PlansModal({ onClose, onChoose }) {
  const titleId = useId();
  // Focus starts on the close button (first in the dialog): focusing a plan
  // button would scroll a phone's stacked cards past the heading.
  const panelRef = useDialogBehavior(onClose);
  const dismiss = useOverlayDismiss(onClose);
  const [billing, setBilling] = useState("monthly");
  const saving = Math.min(...PLANS.map(yearlySaving));

  return (
    <div className="overlay plans-overlay" {...dismiss}>
      <section ref={panelRef} className="plans-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="plans-close" aria-label="Close plans" onClick={onClose}><CloseBar /></button>
        <h2 id={titleId} className="plans-title">Flexible Plans</h2>
        <p className="plans-lede">On-brand copy for every channel, at the pace your team ships. Pick a plan, switch anytime.</p>

        <ul className="plans-grid">
          {PLANS.map((plan, index) => {
            const price = priceFor(plan, billing);
            const [whole, cents] = price.toFixed(2).split(".");
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
                    <FlameIcon tone={plan.chip.tone} />
                    {plan.chip.label}
                  </span>
                </div>
                <h3 className="plan-name">
                  {plan.name}
                  <br />
                  {plan.kind}
                </h3>
                <p className="plan-tagline">{plan.tagline}</p>
                <p className="plan-price" aria-label={`$${whole}.${cents} per month${billing === "yearly" ? ", billed yearly" : ""}`}>
                  {/* key: the number replays its swap animation when it changes */}
                  <span key={price} className="plan-price-amount" aria-hidden="true">
                    ${whole}
                    <span className="plan-price-cents">.{cents}</span>
                  </span>
                  <span className="plan-price-period" aria-hidden="true">/Mo</span>
                </p>
                <button type="button" className="plan-cta" onClick={() => onChoose?.(plan, billing)}>
                  {plan.cta}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="plans-save">{saving}% on annual plan</p>
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
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
