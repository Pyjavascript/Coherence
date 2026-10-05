function Group({ label, items, empty, currentId, onSelect, onNew, newTitle, headStyle }) {
  return (
    <div className="rail-group">
      <div className="rail-head" style={headStyle}>
        <span className="lbl">{label}</span>
        <button className="rail-new" title={newTitle} onClick={onNew}>+</button>
      </div>
      <div className="rail-items">
        {items.length === 0 ? (
          <div className="rail-empty">{empty}</div>
        ) : (
          items.map((b) => (
            <div key={b.id} className={"rail-item" + (b.id === currentId ? " active" : "")} onClick={() => onSelect(b.id)}>
              <span className="rail-dot" />
              <span>{b.name || "Untitled"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function BrandSidebar({ brands, currentId, onSelect, onNew }) {
  return (
    <aside className="rail">
      <div className="rail-list" style={{ paddingTop: ".5rem" }}>
        <Group
          label="Global brands" newTitle="New global brand" headStyle={{ padding: ".35rem .8rem .4rem" }}
          items={brands.filter((b) => b.scope === "global")}
          empty="None yet. A global brand's core carries across every market you run."
          currentId={currentId} onSelect={onSelect} onNew={() => onNew("global")}
        />
        <Group
          label="Brands" newTitle="New brand" headStyle={{ padding: ".5rem .8rem .4rem" }}
          items={brands.filter((b) => b.scope !== "global")}
          empty="No saved brands yet. Fill in the panel and save one."
          currentId={currentId} onSelect={onSelect} onNew={() => onNew("regular")}
        />
      </div>
    </aside>
  );
}
