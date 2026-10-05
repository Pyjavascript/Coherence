// Browser host. A future Figma host (src/hosts/figma.js) will export the same
// shape (copyText / openExternal / downloadText, plus selection + apply helpers),
// so the React UI and AI logic stay shared and only this file gets swapped.

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("copy failed");
}

function openExternal(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

const host = { name: "browser", copyText, openExternal, downloadText };
export default host;
