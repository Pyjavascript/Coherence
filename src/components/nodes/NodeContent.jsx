// Body of a node: placeholder, skeleton, error, or the generated copy.
// `version` changes every time new content lands, re-running the fade-in.
export default function NodeContent({ meta, status, item, version, message, onRetry }) {
  if (status === "loading" && !item) {
    return (
      <div className="ncard-body" aria-busy="true">
        <div className="ncard-skel w70" />
        <div className="ncard-skel" />
        <div className="ncard-skel w40" />
      </div>
    );
  }

  if (status === "error" && !item) {
    return (
      <div className="ncard-body is-error" role="status">
        <p>{message || "Couldn't generate — try again."}</p>
        <button type="button" className="ncard-retry" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="ncard-body">
        <p className="ncard-placeholder">{meta.placeholder}</p>
      </div>
    );
  }

  return (
    <div className={"ncard-body is-generated" + (status === "loading" ? " is-refreshing" : "")} aria-live="polite" aria-busy={status === "loading"}>
      <div className="ncard-copy" key={version}>
        <p className="ncard-headline">{item.headline}</p>
        {item.sub ? <p className="ncard-sub">{item.sub}</p> : null}
      </div>
    </div>
  );
}
