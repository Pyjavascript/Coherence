import { MODEL_OPTIONS } from "../lib/constants";
import { LIMITS } from "../lib/clientId";

export default function Header({
  fileLabel,
  tier,
  onTier,
  premium,
  onPremium,
  onGenerate,
  generating,
  usage,
  atGenLimit,
}) {
  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="tb-mark">B</div>
        <div className="tb-titles">
          <span className="tb-product">Brand Language OS</span>
          <span className="tb-file">{fileLabel}</span>
        </div>
      </div>
      <div className="tb-right">
        <div className="modelsel">
          <span>Model</span>
          <select value={tier} onChange={(e) => onTier(e.target.value)}>
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {/* <div
          className={"switch" + (premium ? " on" : "")}
          role="switch"
          aria-checked={premium}
          tabIndex={0}
          onClick={() => onPremium(!premium)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              onPremium(!premium);
            }
          }}
        >
          <span>Premium (demo)</span>
          <div className="switch-track">
            <div className="switch-knob" />
          </div>
        </div> */}

        {usage && (
          <span
            className="mono"
            style={{
              fontSize: "13px",
              color: "var(--muted-2)",
              marginRight: "12px",
            }}
          >
            {usage.brands}/{LIMITS.brands} brands · {usage.generations}/
            {LIMITS.generations} generations today
          </span>
        )}
        <button
          className="btn-generate"
          disabled={generating || atGenLimit}
          onClick={onGenerate}
        >
          {generating ? "Generating..." : "Generate all"}
        </button>
      </div>
    </header>
  );
}
