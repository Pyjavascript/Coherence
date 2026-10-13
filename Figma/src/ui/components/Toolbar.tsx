import { MODEL_OPTIONS } from "@web/lib/constants.js";
import type { Brand } from "../hooks/useBrandData";

interface Props {
  brands: Brand[];
  brand: Brand | null;
  onBrand: (id: string) => void;
  tier: string;
  onTier: (tier: string) => void;
  loading: boolean;
}

// Title, model, and brand field — the top of the light floating window.
export default function Toolbar({ brands, brand, onBrand, tier, onTier, loading }: Props) {
  const model = MODEL_OPTIONS.find((m) => m.value === tier);
  return (
    <header className="plugin-head">
      <div className="toolbar">
        <div className="wordmark">Brand Language OS</div>
        <span className="plan-chip">Free</span>
        <select
          className="model-chip"
          aria-label="Model"
          value={tier}
          onChange={(e) => onTier(e.target.value)}
          title={model?.description}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label} · {m.value}
            </option>
          ))}
        </select>
      </div>
      <label className="brand-field">
        <select
          aria-label="Brand"
          value={brand?.id ?? ""}
          onChange={(e) => onBrand(e.target.value)}
          disabled={loading || !brands.length}
        >
          {!brand && <option value="">{loading ? "Loading brands…" : "Choose a brand"}</option>}
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name || "Untitled brand"}
              {b.scope === "global" ? " · global" : ""}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
