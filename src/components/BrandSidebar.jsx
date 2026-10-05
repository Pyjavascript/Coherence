// function Group({ label, items, empty, currentId, onSelect, onNew, newTitle, headStyle }) {
//   return (
//     <div className="rail-group">
//       <div className="rail-head" style={headStyle}>
//         <span className="lbl">{label}</span>
//         <button className="rail-new" title={newTitle} onClick={onNew}>+</button>
//       </div>
//       <div className="rail-items">
//         {items.length === 0 ? (
//           <div className="rail-empty">{empty}</div>
//         ) : (
//           items.map((b) => (
//             <div key={b.id} className={"rail-item" + (b.id === currentId ? " active" : "")} onClick={() => onSelect(b.id)}>
//               <span
//                 className="rail-dot"
//                 style={{ backgroundColor: b.color || 'var(--border-strong)' }}
//               />
//               <span>{b.name || "Untitled"}</span>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

// export default function BrandSidebar({ brands, currentId, onSelect, onNew }) {
//   return (
//     <aside className="rail">
//       <div className="rail-list" style={{ paddingTop: ".5rem" }}>
//         <Group
//           label="Global brands" newTitle="New global brand" headStyle={{ padding: ".35rem .8rem .4rem" }}
//           items={brands.filter((b) => b.scope === "global")}
//           empty="None yet. A global brand's core carries across every market you run."
//           currentId={currentId} onSelect={onSelect} onNew={() => onNew("global")}
//         />
//         <Group
//           label="Brands" newTitle="New brand" headStyle={{ padding: ".5rem .8rem .4rem" }}
//           items={brands.filter((b) => b.scope !== "global")}
//           empty="No saved brands yet. Fill in the panel and save one."
//           currentId={currentId} onSelect={onSelect} onNew={() => onNew("regular")}
//         />
//       </div>
//     </aside>
//   );
// }
import { useState, useRef, useEffect } from "react";

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
            <div
              key={b.id}
              className={"rail-item" + (b.id === currentId ? " active" : "")}
              onClick={() => onSelect(b.id)}
            >
              {b.logo ? (
                <img
                  src={b.logo}
                  alt={b.name || "Brand"}
                  className="rail-brand-avatar"
                />
              ) : (
                <span className="rail-dot" />
              )}
              <span>{b.name || "Untitled"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function BrandSidebar({ brands, currentId, onSelect, onNew, user, onLogin, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the popup if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className="rail" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
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

      {/* --- NEW: User Profile Icon & Popup --- */}
      <div className="rail-footer">
        {user ? (
          <div className="user-profile" ref={menuRef}>
            <div 
              className="avatar" 
              onClick={() => setMenuOpen(!menuOpen)}
              title={user.email}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
            
            {menuOpen && (
              <div className="user-menu">
                <span className="user-menu-label">Signed in as</span>
                <span className="user-menu-email" title={user.email}>{user.email}</span>
                <div className="user-menu-divider"></div>
                <button onClick={() => { setMenuOpen(false); onLogout(); }}>Log out</button>
              </div>
            )}
          </div>
        ) : (
          <div className="user-profile" onClick={onLogin}>
            <div className="avatar login-avatar" title="Log in">?</div>
          </div>
        )}
      </div>
    </aside>
  );
}