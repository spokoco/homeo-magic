// Homeo-Magic UI kit — shared components
// Uses window.React (loaded in index.html). All components export to window.

const { useState, useMemo, useRef, useEffect } = React;

// ——— Icons (Lucide style) ———
const Icon = ({ d, size = 16, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);
const SearchIcon = (p) => <Icon {...p} d='<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>' />;
const EyeIcon = (p) => <Icon {...p} d='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' />;
const EyeOffIcon = (p) => <Icon {...p} d='<path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5-5.9"/><path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' />;
const TrashIcon = (p) => <Icon {...p} d='<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' />;
const GripIcon = (p) => <Icon {...p} fill="currentColor" d='<circle cx="9" cy="4" r="2"/><circle cx="15" cy="4" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/>' />;
const XIcon = (p) => <Icon {...p} d='<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' />;
const BookIcon = (p) => <Icon {...p} d='<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' />;
const SettingsIcon = (p) => <Icon {...p} d='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>' />;

// ——— Header / banner ———
function HeaderBar({ rubricCount, remedyCount }) {
  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, color: "var(--paper)", padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img src="../../assets/logo-lockup-inverse.svg" alt="Homeo-Magic" width="260" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 14, color: "var(--fg-muted-on-ink)" }}>
        <span>{rubricCount.toLocaleString()} rubrics · {remedyCount.toLocaleString()} remedies</span>
        <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--paper)", textDecoration: "none", opacity: 0.9 }}>
          <SettingsIcon size={14} /> Color settings
        </a>
      </div>
    </header>
  );
}

// ——— Search / autocomplete ———
function SearchPanel({ query, setQuery, suggestions, onSelect, selectedRubricsCount }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef();
  const show = open && suggestions.length > 0;
  useEffect(() => { setHi(0); }, [suggestions]);

  return (
    <div style={{ padding: "18px 20px", background: "var(--ink)", color: "var(--paper)" }}>
      <label style={{ display: "block", font: "700 12px/1 var(--font-sans)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--sage)", marginBottom: 8 }}>
        Add rubrics {selectedRubricsCount > 0 && <span style={{ color: "var(--ink-30)", marginLeft: 8 }}>{selectedRubricsCount} selected</span>}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-50)", pointerEvents:"none" }}>
          <SearchIcon size={18} />
        </span>
        <input
          ref={ref}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((p) => Math.min(p + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((p) => Math.max(p - 1, 0)); }
            else if (e.key === "Enter" && suggestions[hi]) { onSelect(suggestions[hi]); setQuery(""); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Type to search (e.g., headache, anxiety, burning)..."
          style={{ width: "100%", padding: "14px 16px 14px 44px", font: "400 15px/1 var(--font-sans)", border: "1.5px solid var(--ink-70)", borderRadius: "var(--r-md)", background: "var(--paper)", color: "var(--fg-1)", outline: "none", boxSizing: "border-box" }}
        />
        {show && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--paper)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", boxShadow: "var(--shadow-lg)", maxHeight: 280, overflowY: "auto", zIndex: 10 }}>
            {suggestions.map((s, i) => (
              <button
                key={s}
                onMouseDown={(e) => { e.preventDefault(); onSelect(s); setQuery(""); }}
                onMouseEnter={() => setHi(i)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", font: "400 14px/1.3 var(--font-sans)", color: "var(--fg-1)", background: i === hi ? "var(--bg-sunken)" : "transparent", border: 0, borderBottom: "1px solid var(--ink-08)", cursor: "pointer" }}
              >
                <HighlightMatch text={s} query={query} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function HighlightMatch({ text, query }) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(41,169,158,0.22)", padding: "0 2px", borderRadius: 2 }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ——— Grade cell ———
function GradeCell({ grade }) {
  if (!grade) return <span style={{ color: "var(--ink-30)" }}>·</span>;
  const style = [
    { background: "var(--grade-1-bg)", color: "var(--grade-1-fg)" },
    { background: "var(--grade-2-bg)", color: "var(--grade-2-fg)" },
    { background: "var(--grade-3-bg)", color: "var(--grade-3-fg)" },
  ][grade - 1];
  return (
    <span style={{ ...style, width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, borderRadius: "var(--r-md)" }}>{grade}</span>
  );
}

// ——— Empty state ———
function EmptyState() {
  return (
    <div style={{ padding: "64px 20px", textAlign: "center", color: "var(--fg-2)", background: "var(--bg-herb)" }}>
      <img src="../../assets/mark.svg" width="64" style={{ opacity: 0.8, marginBottom: 16 }} alt="" />
      <div style={{ font: "400 15px/1.5 var(--font-sans)", color: "var(--ink-70)" }}>Search and select rubrics to find matching remedies.</div>
      <div style={{ font: "400 13px/1.5 var(--font-sans)", color: "var(--fg-3)", marginTop: 6 }}>Example: <em>headache, morning</em> · <em>irritability</em> · <em>cold, agg.</em></div>
    </div>
  );
}

// ——— Footer ———
function FooterBar() {
  return (
    <footer style={{ marginTop: 32, padding: "20px 4px", font: "400 12px/1.5 var(--font-sans)", color: "var(--sage)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>Homeo-Magic · Repertorization tool</div>
      <div>Based on Kent's Repertory · 1897 · Public domain</div>
    </footer>
  );
}

Object.assign(window, {
  HeaderBar, SearchPanel, GradeCell, EmptyState, FooterBar,
  SearchIcon, EyeIcon, EyeOffIcon, TrashIcon, GripIcon, XIcon, BookIcon, SettingsIcon
});
