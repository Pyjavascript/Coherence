import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TIER, INDUSTRY_LAYERS } from "@web/lib/constants.js";
import { LIMITS } from "@web/lib/clientId.js";
import { FREE_HOOKS_PER_DAY, hookQuotaFrom, timeUntilReset } from "@web/lib/hookQuota.js";
import { buildCoherencePrompt } from "@web/lib/prompts.js";
import { describeError, generateCoherenceCheck, generateHook, generateNode } from "@web/services/ai.js";
import { saveGeneration } from "@web/services/brands.js";
import type { PluginUsage } from "../hooks/usePluginSession";
import { useBrandData } from "../hooks/useBrandData";
import { usePrefs } from "../hooks/usePrefs";
import { useSelection } from "../hooks/useSelection";
import { useCanvas } from "../hooks/useCanvas";
import { variantBlocks, type Variant } from "../lib/variants";
import { hasWebApp, openWebApp } from "../lib/webApp";
import { parseReview, reviewTextBlocks, type ReviewBlock } from "../lib/reviewFormat";
import type { TextBlock } from "../../shared/protocol";
import BrandPicker from "./BrandPicker";
import {
  BoltIcon, BoxIcon, ChatIcon, CheckCircleIcon, CloseIcon, ExternalIcon, GlobeIcon, InfoIcon, InsertIcon, KeyIcon,
  LogoMark, MailIcon, MegaphoneIcon, PlusIcon, PullIcon, SparkIcon, TagIcon,
} from "./icons";

// Research notes are a Premium feature in the web app, so the free plugin has no Research tab.
type Panel = "generate" | "brand" | "hook" | "coherence";

const PILLS: { key: Panel; label: string; Icon: () => JSX.Element }[] = [
  { key: "generate", label: "Generate", Icon: SparkIcon },
  { key: "brand", label: "Brand", Icon: TagIcon },
  { key: "hook", label: "Hook", Icon: BoltIcon },
  { key: "coherence", label: "Coherence", Icon: CheckCircleIcon },
];

const MEDIUMS = [
  { key: "email", label: "Email", Icon: MailIcon },
  { key: "social", label: "Social", Icon: ChatIcon },
  { key: "website", label: "Website", Icon: GlobeIcon },
  { key: "advertising", label: "Ad", Icon: MegaphoneIcon },
  { key: "packaging", label: "Packaging", Icon: BoxIcon },
];

const INDUSTRIES = Object.entries(INDUSTRY_LAYERS as Record<string, { label: string }>).map(([key, layer]) => ({
  key,
  label: layer.label,
}));

interface Props {
  userId: string;
  usage: PluginUsage;
  onUsed: () => void;
  onChangeKey: () => void;
}

export default function Workspace({ userId, usage, onUsed, onChangeKey }: Props) {
  const { prefs, loaded: prefsLoaded, update } = usePrefs();
  const data = useBrandData(userId, prefs.brandId);
  const { text: selectionText } = useSelection();
  const [panel, setPanel] = useState<Panel>("generate");
  const [status, setStatus] = useState("");
  const [addToken, setAddToken] = useState(0);
  const canvas = useCanvas((text) => setStatus(text), () => undefined);

  useEffect(() => {
    if (!data.loading && data.brands.length && !data.brands.some((b) => b.id === prefs.brandId)) {
      update({ brandId: data.brands[0].id });
    }
  }, [data.loading, data.brands, prefs.brandId, update]);

  const atGenLimit = usage.generations >= LIMITS.generations;
  const quota = hookQuotaFrom(usage.hooks);
  const brand = data.brand;
  const ctx = brand ? { brand, notes: data.notes, stylePack: "classic" } : null;

  // Short confirmations ("Brand saved.") fade out on their own.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 3200);
    return () => clearTimeout(timer);
  }, [status]);

  if (!prefsLoaded) {
    return (
      <div className="center-state" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        Loading…
      </div>
    );
  }

  const atBrandLimit = data.brands.length >= LIMITS.brands;
  const addBrand = () => {
    setPanel("brand");
    setAddToken((n) => n + 1);
  };

  return (
    <div className="app">
      <header className="head">
        <div className="toolbar">
          <span className="app-mark"><LogoMark /></span>
          <div className="wordmark">
            Brand Language OS
            <span className="plan-chip">Free</span>
          </div>
          {hasWebApp && (
            <button type="button" className="icon-btn" onClick={() => openWebApp()} aria-label="Open Brand Language OS" title="Open Brand Language OS">
              <ExternalIcon />
            </button>
          )}
          <button type="button" className="icon-btn" onClick={onChangeKey} aria-label="Plugin API key" title="Plugin API key">
            <KeyIcon />
          </button>
        </div>

        <BrandPicker
          brands={data.brands}
          brand={brand}
          loading={data.loading}
          atLimit={atBrandLimit}
          limit={LIMITS.brands}
          onSelect={(brandId) => update({ brandId })}
          onAdd={addBrand}
        />
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {PILLS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={"tab" + (panel === key ? " is-active" : "")}
            aria-selected={panel === key}
            onClick={() => setPanel(key)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <main className="body">
        {!brand && panel !== "brand" ? (
          <section className="tab-body">
            <div className="empty-state">
              <span className="empty-icon"><SparkIcon /></span>
              <h2>{data.loading ? "Loading your brands…" : "Start with a brand"}</h2>
              <p>Your brand's belief and message shape every line the plugin writes.</p>
              {!data.loading && (
                <button type="button" className="btn btn-primary" onClick={addBrand}>
                  <PlusIcon />
                  Add brand
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            {panel === "generate" && brand && ctx && (
              <GeneratePanel
                ctx={ctx}
                category={prefs.category}
                onCategory={(category) => {
                  update({ category });
                  setPanel("generate");
                }}
                selectionText={selectionText}
                atLimit={atGenLimit}
                busy={canvas.busy}
                onInsert={(name, variant) => canvas.insert(name, variantBlocks(variant))}
                onUsed={onUsed}
              />
            )}
            {panel === "brand" && (
              <BrandPanel
                brand={brand}
                atBrandLimit={atBrandLimit}
                addToken={addToken}
                onSave={async (draft) => {
                  const id = await data.saveBrand(draft);
                  if (id) {
                    update({ brandId: id });
                    setPanel("generate");
                    setStatus("Brand saved.");
                  }
                }}
              />
            )}
            {panel === "hook" && ctx && (
              <HookPanel
                ctx={ctx}
                quota={quota}
                atLimit={atGenLimit}
                selectionText={selectionText}
                busy={canvas.busy}
                onInsert={(text) => canvas.insert("Hook", [{ role: "headline", text }])}
                onUsed={onUsed}
              />
            )}
            {panel === "coherence" && ctx && (
              <CoherencePanel
                ctx={ctx}
                selectionText={selectionText}
                atLimit={atGenLimit}
                busy={canvas.busy}
                onInsert={(blocks) => canvas.insert("Coherence review", blocks)}
                onUsed={onUsed}
              />
            )}
          </>
        )}
      </main>

      {(data.error || status) && (
        <div className={"toast" + (data.error ? " is-error" : "")} role="status">
          <span>{data.error || status}</span>
          {data.error && (
            <button type="button" className="toast-close" onClick={() => data.setError("")} aria-label="Dismiss">
              <CloseIcon />
            </button>
          )}
        </div>
      )}

      <footer className="footer">
        <Meter label="Credits" used={usage.generations} total={LIMITS.generations} />
        <Meter label="Free hook" used={FREE_HOOKS_PER_DAY - quota.left} total={FREE_HOOKS_PER_DAY} />
        <Meter label="Brands" used={Math.min(data.brands.length, LIMITS.brands)} total={LIMITS.brands} calm />
      </footer>
    </div>
  );
}

// calm: reaching the limit is normal (brands), so it isn't shown as a warning.
function Meter({ label, used, total, calm }: { label: string; used: number; total: number; calm?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className={"meter" + (used >= total && !calm ? " is-full" : "")} title={`${label}: ${used} of ${total} used`}>
      <div className="meter-row">
        <span>{label}</span>
        <b>
          {used}/{total}
        </b>
      </div>
      <span className="meter-track" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function PullButton({ onPull, disabled }: { onPull: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-soft" title="Use the text selected on the canvas" onClick={onPull} disabled={disabled}>
      <PullIcon />
      Pull
    </button>
  );
}

function InsertButton({ onInsert, disabled }: { onInsert: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-small btn-primary" title="Insert into the canvas" onClick={onInsert} disabled={disabled}>
      <InsertIcon />
      Insert into canvas
    </button>
  );
}

function GeneratePanel(props: {
  ctx: { brand: { id: string; name?: string; message?: string }; notes: unknown[] };
  category: string;
  onCategory: (key: string) => void;
  selectionText: string;
  atLimit: boolean;
  busy: boolean;
  onInsert: (name: string, variant: Variant) => void;
  onUsed: () => void;
}) {
  const medium = MEDIUMS.some((m) => m.key === props.category) ? props.category : "social";
  const [brief, setBrief] = useState("");
  const [variant, setVariant] = useState<Variant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const label = MEDIUMS.find((m) => m.key === medium)?.label || "Copy";

  const generate = async () => {
    if (busy || props.atLimit) return;
    if (!brief.trim() && !props.ctx.brand.message?.trim()) {
      setError("Add a brief, or a brand message, first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result: Variant[] = await generateNode({
        ctx: props.ctx,
        node: {
          category: medium,
          label,
          brief,
          words: 60,
          requirements: "",
          platform: medium === "social" ? "Instagram" : null,
          component: "hero",
          pointerCount: 3,
        },
        variantCount: 1,
        linkedNodes: [],
        source: null,
        tier: DEFAULT_TIER,
      });
      setVariant(result[0] || null);
      props.onUsed();
      saveGeneration({
        brandId: props.ctx.brand.id,
        medium: `node-${medium}`,
        inputContext: { brief, label, source: "figma" },
        output: result,
      });
    } catch (err) {
      setError(describeError(err));
      props.onUsed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tab-body" aria-label="Generate">
      <div className="card">
        <span className="field-label">Channel</span>
        <div className="chips" role="radiogroup" aria-label="Channel">
          {MEDIUMS.map(({ key, label: name, Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              className={"chip" + (key === medium ? " is-active" : "")}
              aria-checked={key === medium}
              onClick={() => props.onCategory(key)}
            >
              <Icon />
              {name}
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="generate-brief">Brief</label>
        <textarea
          id="generate-brief"
          rows={4}
          maxLength={2000}
          placeholder={`What should this ${label.toLowerCase()} copy do?`}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        <div className="row">
          <PullButton disabled={!props.selectionText.trim()} onPull={() => setBrief(props.selectionText)} />
          <button type="button" className="btn btn-primary btn-grow" onClick={generate} disabled={busy || props.atLimit}>
            {busy ? <span className="spinner is-light" aria-hidden="true" /> : <SparkIcon />}
            {props.atLimit ? `Daily limit reached · ${LIMITS.generations}/${LIMITS.generations}` : busy ? "Writing…" : "Generate"}
          </button>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {variant && (
        <article className="result">
          <span className="result-tag">{label}</span>
          {"headline" in variant && variant.headline ? <h3 className="result-headline">{variant.headline}</h3> : null}
          {"body" in variant && variant.body ? <p className="result-body is-expanded">{variant.body}</p> : null}
          {"pointers" in variant && variant.pointers ? (
            <ul className="pointers">
              {variant.pointers.map((p, i) => (
                <li key={i}>
                  <strong>{p.title}</strong> <span className="muted">{p.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="result-actions">
            <InsertButton disabled={props.busy || !variantBlocks(variant).length} onInsert={() => props.onInsert(`${label} copy`, variant)} />
          </div>
        </article>
      )}
    </section>
  );
}

function BrandPanel(props: {
  brand: { id: string; name?: string; belief?: string; message?: string; industry?: string } | null;
  atBrandLimit: boolean;
  addToken: number;
  onSave: (draft: { id?: string; name: string; belief: string; message: string; industry: string }) => Promise<void>;
}) {
  const [creating, setCreating] = useState(!props.brand);
  const [name, setName] = useState(props.brand?.name || "");
  const [belief, setBelief] = useState(props.brand?.belief || "");
  const [message, setMessage] = useState(props.brand?.message || "");
  const [industry, setIndustry] = useState(props.brand?.industry || "general");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!props.addToken || props.atBrandLimit) return;
    setCreating(true);
    setName("");
    setBelief("");
    setMessage("");
    setIndustry("general");
  }, [props.addToken, props.atBrandLimit]);

  useEffect(() => {
    if (creating) return;
    setName(props.brand?.name || "");
    setBelief(props.brand?.belief || "");
    setMessage(props.brand?.message || "");
    setIndustry(props.brand?.industry || "general");
  }, [props.brand, creating]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    await props.onSave({
      id: creating ? undefined : props.brand?.id,
      name,
      belief,
      message,
      industry,
    });
    setBusy(false);
    setCreating(false);
  };

  return (
    <section className="tab-body" aria-label="Brand">
      <div className="segmented" role="tablist" aria-label="Brand mode">
        {props.brand && (
          <button type="button" role="tab" aria-selected={!creating} className={!creating ? "is-active" : ""} onClick={() => setCreating(false)}>
            Edit {props.brand.name || "brand"}
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={creating}
          className={creating ? "is-active" : ""}
          onClick={() => { setCreating(true); setName(""); setBelief(""); setMessage(""); setIndustry("general"); }}
        >
          <PlusIcon />
          New brand
        </button>
      </div>
      {props.atBrandLimit && creating ? (
        <div className="callout">
          <InfoIcon />
          <p>The free plan includes {LIMITS.brands} brands. Edit one of yours, or remove one in the web app to add another.</p>
        </div>
      ) : (
        <div className="card">
          <label className="field">
            <span className="field-label">Name</span>
            <input value={name} maxLength={80} placeholder="e.g. Northwind Coffee" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Belief</span>
            <textarea rows={3} maxLength={2000} placeholder="What does this brand believe about the world?" value={belief} onChange={(e) => setBelief(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Message to adapt</span>
            <textarea rows={3} maxLength={2000} placeholder="The core message every piece should carry" value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Industry</span>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {INDUSTRIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary btn-block" onClick={save} disabled={busy || !name.trim()}>
            {busy && <span className="spinner is-light" aria-hidden="true" />}
            {busy ? "Saving…" : creating ? "Create brand" : "Save changes"}
          </button>
        </div>
      )}
    </section>
  );
}

function HookPanel(props: {
  ctx: object;
  quota: { left: number };
  atLimit: boolean;
  selectionText: string;
  busy: boolean;
  onInsert: (text: string) => void;
  onUsed: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [hook, setHook] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const usedUp = props.quota.left <= 0;

  const run = async () => {
    if (busy || usedUp || props.atLimit) return;
    if (!brief.trim()) {
      setMessage("Describe what the hook is for first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const text = await generateHook({ ctx: props.ctx, requirement: brief, tier: DEFAULT_TIER });
      setHook(text);
      props.onUsed();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "hook_limit") setMessage(`You've used today's free hook. The next one unlocks in ${timeUntilReset()}.`);
      else setMessage(describeError(err));
      props.onUsed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tab-body" aria-label="Hook">
      <div className={"quota" + (usedUp ? " is-used" : "")}>
        <SparkIcon />
        <p>
          {usedUp
            ? `You've used today's free hook. The next one unlocks in ${timeUntilReset()}.`
            : `${props.quota.left} of ${FREE_HOOKS_PER_DAY} free hook left today.`}
        </p>
      </div>
      <div className="card">
        <label className="field">
          <span className="field-label">What should this hook be about?</span>
          <textarea rows={3} maxLength={2000} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Describe the moment, audience, or idea…" />
        </label>
        <div className="row">
          <PullButton disabled={!props.selectionText.trim()} onPull={() => setBrief(props.selectionText)} />
          <button type="button" className="btn btn-primary btn-grow" onClick={run} disabled={busy || usedUp || props.atLimit}>
            {busy ? <span className="spinner is-light" aria-hidden="true" /> : <SparkIcon />}
            {busy ? "Writing…" : usedUp ? `Next free hook in ${timeUntilReset()}` : "Generate hook"}
          </button>
        </div>
      </div>
      {(hook || message) && (
        <article className={"result" + (hook ? "" : " is-note")}>
          {hook && <span className="result-tag">Hook</span>}
          <h3 className="result-headline">{hook || message}</h3>
          {hook && (
            <div className="result-actions">
              <InsertButton disabled={props.busy} onInsert={() => props.onInsert(hook)} />
            </div>
          )}
        </article>
      )}
    </section>
  );
}

function CoherencePanel(props: {
  ctx: object;
  selectionText: string;
  atLimit: boolean;
  busy: boolean;
  onInsert: (blocks: TextBlock[]) => void;
  onUsed: () => void;
}) {
  const [sample, setSample] = useState("");
  const [prompt, setPrompt] = useState("");
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reviewBlocks = useMemo(() => parseReview(review), [review]);

  useEffect(() => {
    setPrompt(buildCoherencePrompt(props.ctx, { sampleCopy: sample || "(paste the copy you want checked)", sourceLabel: "Figma" }));
  }, [props.ctx, sample]);

  const run = async () => {
    if (busy || props.atLimit || !sample.trim()) return;
    setBusy(true);
    setError("");
    try {
      const text = await generateCoherenceCheck({
        ctx: props.ctx,
        described: { sampleCopy: sample, sourceLabel: "Figma" },
        tier: DEFAULT_TIER,
      });
      setReview(text || "The review came back empty. Try again.");
      props.onUsed();
    } catch (err) {
      setError(describeError(err));
      props.onUsed();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tab-body" aria-label="Coherence">
      <div className="callout">
        <InfoIcon />
        <p>Checks that your CTA and body copy say the same thing, in this brand's voice.</p>
      </div>
      <div className="card">
        <label className="field">
          <span className="field-label">Copy to check</span>
          <textarea rows={4} maxLength={4000} placeholder="Paste copy, or pull it from the canvas…" value={sample} onChange={(e) => setSample(e.target.value)} />
        </label>
        <div className="row">
          <PullButton disabled={!props.selectionText.trim()} onPull={() => setSample(props.selectionText)} />
          <button type="button" className="btn btn-primary btn-grow" onClick={run} disabled={busy || props.atLimit || !sample.trim()}>
            {busy && <span className="spinner is-light" aria-hidden="true" />}
            {props.atLimit ? `Daily limit reached · ${LIMITS.generations}/${LIMITS.generations}` : busy ? "Checking…" : "Run coherence check"}
          </button>
        </div>
      </div>
      <details className="disclosure">
        <summary>Review prompt</summary>
        <textarea aria-label="Coherence prompt" rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </details>
      {error && <p className="form-error" role="alert">{error}</p>}
      {review && (
        <article className="result">
          <span className="result-tag">Review</span>
          <ReviewView blocks={reviewBlocks} />
          <div className="result-actions">
            <InsertButton disabled={props.busy || !reviewBlocks.length} onInsert={() => props.onInsert(reviewTextBlocks(reviewBlocks))} />
          </div>
        </article>
      )}
    </section>
  );
}

// The coherence review as headings, numbered points, bullets and a quoted rewrite.
function ReviewView({ blocks }: { blocks: ReviewBlock[] }) {
  const items: JSX.Element[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "bullet") {
      // Consecutive bullets form one list.
      const run: Extract<ReviewBlock, { type: "bullet" }>[] = [];
      while (i < blocks.length && blocks[i].type === "bullet") run.push(blocks[i++] as Extract<ReviewBlock, { type: "bullet" }>);
      i--;
      items.push(
        <ul key={i} className="rv-bullets">
          {run.map((item, j) => (
            <li key={j}>
              {item.title && <strong>{item.title}: </strong>}
              {item.text}
            </li>
          ))}
        </ul>,
      );
    } else if (b.type === "score") {
      const [got, of] = b.value.split("/").map(Number);
      const pct = of > 0 ? Math.max(0, Math.min(100, (got / of) * 100)) : 0;
      items.push(
        <div key={i} className={"rv-score" + (pct >= 70 ? " is-good" : pct >= 40 ? " is-mid" : " is-low")}>
          <span className="rv-score-label">{b.label}</span>
          <span className="rv-score-value">{b.value}</span>
          <span className="rv-score-track" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
        </div>,
      );
    } else if (b.type === "heading") {
      items.push(<h4 key={i} className="rv-heading">{b.text}</h4>);
    } else if (b.type === "point") {
      items.push(
        <div key={i} className="rv-point">
          {b.n && <span className="rv-num">{b.n}</span>}
          <p>
            {b.title && <strong>{b.title}</strong>}
            {b.title && b.text ? " " : ""}
            {b.text}
          </p>
        </div>,
      );
    } else if (b.type === "quote") {
      items.push(<blockquote key={i} className="rv-quote">{b.text}</blockquote>);
    } else {
      items.push(<p key={i} className="rv-para">{b.text}</p>);
    }
  }
  return <div className="review">{items}</div>;
}
