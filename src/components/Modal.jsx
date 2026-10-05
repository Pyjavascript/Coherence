import { useState } from "react";
import { Skeleton } from "./OutputCard";

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head"><h3>{title}</h3><button onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

export function CoherenceModal({ text, onCopy, onClose }) {
  return (
    <Modal title="Coherence prompt" onClose={onClose}>
      <div className="field" style={{ marginBottom: ".7rem" }}>
        <label>Paste this into ChatGPT, Gemini, or any other LLM to QA whether the CTA and body copy of your latest generation actually agree with each other.</label>
      </div>
      <div className="coherence-out">{text}</div>
      <div className="btnrow" style={{ marginTop: ".8rem" }}>
        <button className="btn-primary-sm" style={{ flex: 1 }} onClick={() => onCopy(text)}>Copy prompt</button>
      </div>
    </Modal>
  );
}

export function HookModal({ aiAvailable, onGenerate, onCopy, onClose }) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState({ state: "idle", text: "" });

  const run = async () => {
    const req = input.trim();
    if (!req) return setOut({ state: "msg", text: "Describe what the hook is for first." });
    if (!aiAvailable) return setOut({ state: "msg", text: "AI generation isn't available here." });
    setOut({ state: "loading", text: "" });
    try {
      setOut({ state: "ready", text: await onGenerate(req) });
    } catch (e) {
      setOut({ state: "msg", text: "Couldn't generate — try again." });
    }
  };

  return (
    <Modal title="Hook generator" onClose={onClose}>
      <div className="bonus-note">Describe the moment this hook is for. It analyses your brief against the brand core and hands back one decisive line instead of a pile of options to sift through.</div>
      <div className="modal-add">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Opening line for a reel showing the fragrance being poured for the first time." />
        <button className="btn-primary-sm" onClick={run}>Generate hook</button>
      </div>
      <div className="hook-card">
        {out.state === "loading" && <Skeleton />}
        {out.state === "ready" && <div className="frame-headline">{out.text}</div>}
        {out.state === "msg" && <div className="frame-placeholder">{out.text}</div>}
        {out.state === "idle" && <div className="frame-placeholder">Your hook will appear here.</div>}
      </div>
      <div className="btnrow" style={{ marginTop: ".8rem" }}>
        <button className="ghost" style={{ flex: 1 }} onClick={() => onCopy(out.state === "ready" ? out.text : "")}>Copy hook</button>
      </div>
    </Modal>
  );
}
