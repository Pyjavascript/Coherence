import BrandMark from "@web/components/BrandMark.jsx";
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

// Brand picker + model tier, the top of the mockup's floating window.
export default function Toolbar({ brands, brand, onBrand, tier, onTier, loading }: Props) {
  return (
    <header className="toolbar">
      <span className="brand-avatar" aria-hidden="true">
        {brand?.logo ? <img src={brand.logo} alt="" /> : <BrandMark brand={brand ?? { id: "none" }} className="" />}
      </span>
      <select
        className="brand-select"
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
      <select
        className="model-chip mono"
        aria-label="Model"
        value={tier}
        onChange={(e) => onTier(e.target.value)}
        title={MODEL_OPTIONS.find((m) => m.value === tier)?.description}
      >
        {MODEL_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label} · {m.value}
          </option>
        ))}
      </select>
    </header>
  );
}
