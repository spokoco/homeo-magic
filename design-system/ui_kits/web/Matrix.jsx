// Homeo-Magic UI kit — the analysis matrix + detail panels

const { useState, useMemo } = React;

// Mock data — enough to make the matrix feel real
const MOCK_RUBRICS = {
  "head, pain, morning, on waking": { remedies: { "Nux-v": 3, "Bry": 2, "Sulph": 1, "Nat-m": 2, "Calc": 1, "Lach": 2 } },
  "mind, irritability, morning": { remedies: { "Nux-v": 3, "Sulph": 2, "Bry": 1, "Sep": 2, "Lyc": 1, "Cham": 3 } },
  "generalities, cold, agg.": { remedies: { "Nux-v": 2, "Bry": 2, "Sulph": 3, "Ars": 3, "Hep": 2, "Calc": 2 } },
  "head, pain, forehead, morning": { remedies: { "Nux-v": 2, "Bry": 3, "Sulph": 2 } },
  "stomach, nausea, morning": { remedies: { "Nux-v": 3, "Sep": 3, "Puls": 2 } },
  "sleep, sleeplessness, thoughts from": { remedies: { "Nux-v": 3, "Coff": 3, "Sulph": 2 } },
};
const REMEDIES = {
  "Nux-v": "Nux vomica", "Bry": "Bryonia alba", "Sulph": "Sulphur",
  "Nat-m": "Natrum muriaticum", "Calc": "Calcarea carbonica", "Lach": "Lachesis",
  "Sep": "Sepia", "Lyc": "Lycopodium", "Cham": "Chamomilla",
  "Ars": "Arsenicum album", "Hep": "Hepar sulph", "Puls": "Pulsatilla", "Coff": "Coffea"
};

function computeResults(selected) {
  if (!selected.length) return { items: [], total: 0 };
  const remedyScores = {};
  const breakdown = {};
  for (const sym of selected) {
    const rubric = MOCK_RUBRICS[sym];
    if (!rubric) continue;
    for (const [rem, g] of Object.entries(rubric.remedies)) {
      remedyScores[rem] = (remedyScores[rem] || 0) + g;
      if (!breakdown[rem]) breakdown[rem] = {};
      breakdown[rem][sym] = g;
    }
  }
  // Intersection only
  const items = Object.entries(remedyScores)
    .filter(([rem]) => selected.every(s => MOCK_RUBRICS[s]?.remedies?.[rem]))
    .map(([abbrev, totalScore]) => ({ abbrev, totalScore, breakdown: breakdown[abbrev] }))
    .sort((a, b) => b.totalScore - a.totalScore);
  return { items, total: items.length };
}

function AnalysisMatrix({ selectedRubrics, hiddenRubrics, results, onHideToggle, onRemove, onSelectRemedy, onSelectRubric, selectedRemedy, selectedRubric, onClearAll }) {
  const [hoverRem, setHoverRem] = useState(null);
  const [hoverSym, setHoverSym] = useState(null);

  if (!selectedRubrics.length) return <EmptyState />;
  if (!results.items.length) return <div style={{ padding: "64px 20px", textAlign: "center", color: "var(--fg-2)" }}>No remedies found for these rubrics.</div>;

  const displayed = results.items.slice(0, 12);
  const maxScore = displayed[0].totalScore;

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", background: "var(--bg-sunken)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ font: "700 12px/1 var(--font-sans)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-deep)" }}>Analysis</div>
        <div style={{ marginLeft: 20, font: "700 14px/1 var(--font-sans)", color: "var(--fg-1)" }}>
          {displayed.length} remedies matching all {selectedRubrics.length} rubrics
        </div>
        <button onClick={onClearAll} style={{ marginLeft: "auto", background: "transparent", border: 0, color: "var(--fg-2)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, font: "700 12px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Clear all ({selectedRubrics.length}) <TrashIcon size={14} />
        </button>
      </div>

      <div style={{ overflowX: "auto", maxHeight: "64vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", font: "400 13px/1.3 var(--font-sans)" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 16px", textAlign: "right", background: "var(--bg-sunken)", color: "var(--ink-70)", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", position: "sticky", top: 0, left: 0, zIndex: 20, borderBottom: "1px solid var(--border-strong)", minWidth: 360 }}>Remedies →</th>
              {displayed.map((r) => (
                <th key={r.abbrev}
                  onClick={() => onSelectRemedy(r.abbrev)}
                  onMouseEnter={() => setHoverRem(r.abbrev)}
                  onMouseLeave={() => setHoverRem(null)}
                  style={{ padding: "10px 4px", background: (hoverRem === r.abbrev || selectedRemedy === r.abbrev) ? "var(--ink-08)" : "var(--bg-sunken)", writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 700, fontSize: 14, color: "var(--ink)", cursor: "pointer", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid var(--border-strong)", height: 100, whiteSpace: "nowrap" }}>
                  {r.abbrev}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Score row */}
            <tr>
              <td style={{ padding: "10px 16px", textAlign: "right", background: "var(--bg-sunken)", fontWeight: 700, color: "var(--ink)", borderBottom: "1px solid var(--border)", position: "sticky", left: 0, zIndex: 5 }}>Score</td>
              {displayed.map((r) => {
                const t = r.totalScore / maxScore;
                const bg = t > 0.75 ? "var(--grade-3-bg)" : t > 0.5 ? "var(--grade-2-bg)" : "var(--grade-1-bg)";
                const fg = t > 0.75 ? "var(--grade-3-fg)" : t > 0.5 ? "var(--grade-2-fg)" : "var(--grade-1-fg)";
                return (
                  <td key={r.abbrev} style={{ textAlign: "center", padding: "10px 4px", background: bg, color: fg, fontWeight: 700, fontSize: 15, borderBottom: "1px solid var(--border)", boxShadow: (hoverRem === r.abbrev || selectedRemedy === r.abbrev) ? "inset 0 0 0 2px var(--ink)" : undefined }}>
                    {r.totalScore}
                  </td>
                );
              })}
            </tr>
            {/* Rubric rows */}
            {selectedRubrics.map((sym) => {
              const hidden = hiddenRubrics.has(sym);
              const isSel = selectedRubric === sym;
              const isHov = hoverSym === sym;
              return (
                <tr key={sym}
                  onMouseEnter={() => setHoverSym(sym)}
                  onMouseLeave={() => setHoverSym(null)}
                  style={{ opacity: hidden ? 0.4 : 1 }}>
                  <td onClick={() => onSelectRubric(sym)}
                    style={{ padding: "10px 16px 10px 18px", textAlign: "left", background: (isHov || isSel) ? "var(--ink-04)" : "var(--paper)", borderBottom: "1px solid var(--border)", cursor: "pointer", position: "sticky", left: 0, zIndex: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "var(--ink-30)", opacity: isHov ? 1 : 0, transition: "opacity 120ms" }}><GripIcon size={14} /></span>
                      <span style={{ flex: 1, textDecoration: hidden ? "line-through" : "none", color: hidden ? "var(--ink-50)" : "var(--fg-1)" }}>{sym}</span>
                      <span style={{ color: "var(--ink-50)", fontSize: 12 }}>({Object.keys(MOCK_RUBRICS[sym].remedies).length})</span>
                      <button onClick={(e) => { e.stopPropagation(); onHideToggle(sym); }} title={hidden ? "Show" : "Hide"}
                        style={{ border: 0, background: "var(--ink-08)", color: "var(--ink-70)", width: 22, height: 22, borderRadius: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: isHov ? 1 : 0, transition: "opacity 120ms" }}>
                        {hidden ? <EyeOffIcon size={12} /> : <EyeIcon size={12} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onRemove(sym); }} title="Remove"
                        style={{ border: 0, background: "var(--ink-08)", color: "var(--ink-70)", width: 22, height: 22, borderRadius: 4, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: isHov ? 1 : 0, transition: "opacity 120ms" }}>
                        <XIcon size={12} />
                      </button>
                    </div>
                  </td>
                  {displayed.map((r) => {
                    const grade = hidden ? null : r.breakdown[sym];
                    const active = (hoverRem === r.abbrev || selectedRemedy === r.abbrev) && (isHov || isSel);
                    const rowOrCol = (hoverRem === r.abbrev || selectedRemedy === r.abbrev || isHov || isSel);
                    return (
                      <td key={r.abbrev} style={{ textAlign: "center", padding: "8px 4px", borderBottom: "1px solid var(--border)", background: active ? "var(--sage-soft)" : rowOrCol ? "var(--ink-04)" : "transparent" }}>
                        <GradeCell grade={grade} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ——— Detail panel — remedy ———
function RemedyDetail({ abbrev, selectedRubrics, results }) {
  const result = results.items.find(r => r.abbrev === abbrev);
  const name = REMEDIES[abbrev] || abbrev;
  const mockPassages = {
    "head, pain, morning, on waking": "Headache worse in the morning on waking, with a sense of fullness as if the head would burst. The Nux patient wakes with his headache.",
    "mind, irritability, morning": "Irritability is intense, especially in the morning; the patient cannot bear contradiction or noise.",
    "generalities, cold, agg.": "The Nux patient is chilly, sensitive to every draft; symptoms worse from uncovering.",
    "head, pain, forehead, morning": "Pain in the forehead on waking, as if a nail were driven in.",
    "stomach, nausea, morning": "Nausea on waking, with ineffectual urging to vomit.",
    "sleep, sleeplessness, thoughts from": "Wakes at 3 a.m. with a rush of thoughts; cannot sleep again until toward morning.",
  };
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
      <div style={{ padding: "14px 20px", background: "var(--ink)", color: "var(--paper)", font: "700 12px/1 var(--font-sans)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Remedy</div>
      <div style={{ padding: 20 }}>
        <div style={{ font: "700 28px/1.2 var(--font-sans)", color: "var(--fg-1)", marginBottom: 2 }}>{name}</div>
        <div style={{ font: "400 12px/1.3 var(--font-sans)", color: "var(--fg-3)", letterSpacing: "0.06em", marginBottom: 18 }}>Abbreviation · {abbrev} · Score {result?.totalScore || 0}</div>

        <div style={{ font: "700 11px/1 var(--font-sans)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-deep)", marginBottom: 10 }}>Rubric cross-references</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedRubrics.map(sym => {
            const grade = result?.breakdown[sym];
            const passage = mockPassages[sym];
            return (
              <div key={sym} style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 12, background: "var(--bg-sunken)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <GradeCell grade={grade} />
                  <span style={{ font: "700 13px/1.3 var(--font-sans)", color: "var(--fg-1)" }}>{sym}</span>
                </div>
                {passage ? (
                  <div style={{ font: "400 14px/1.7 var(--font-serif)", color: "var(--ink-70)" }}>"{passage}"</div>
                ) : (
                  <div style={{ font: "400 12px/1.5 var(--font-sans)", color: "var(--fg-3)", fontStyle: "italic" }}>No specific passage found.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ——— Lecture panel ———
function LecturePanel({ abbrev }) {
  const name = REMEDIES[abbrev] || abbrev;
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
      <div style={{ padding: "14px 20px", background: "var(--ink)", color: "var(--paper)", font: "700 12px/1 var(--font-sans)", letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
        <BookIcon size={14} /> Lecture
      </div>
      <div style={{ padding: "18px 22px", maxHeight: "60vh", overflowY: "auto" }}>
        <h2 style={{ font: "700 22px/1.2 var(--font-serif)", color: "var(--fg-1)", margin: "0 0 4px" }}>{name}</h2>
        <div style={{ font: "400 11px/1 var(--font-sans)", color: "var(--fg-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Kent's lectures · 1897</div>
        <div style={{ font: "400 15px/1.75 var(--font-serif)", color: "var(--fg-1)", textAlign: "justify", hyphens: "auto" }}>
          <p style={{ margin: "0 0 14px" }}>
            The <mark style={{ background: "rgba(41,169,158,0.22)", padding: "0 2px", borderRadius: 2 }}>Nux</mark> patient is irritable, impatient, cannot bear contradiction, and is worse in the morning. He is the overworked scholar, the sedentary man who eats heavily and sleeps little, the student of late nights and strong coffee.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            <mark style={{ background: "rgba(41,169,158,0.22)", padding: "0 2px", borderRadius: 2 }}>Headache worse in the morning on waking</mark>, with a sense of fullness as if the head would burst. Nausea on waking, with ineffectual urging to vomit. The chilliness is marked; every draft is intolerable, and the patient is worse from uncovering even a hand.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            Sleep is a great trouble. He wakes at three in the morning with a rush of thoughts, cannot sleep again until toward dawn, and then sleeps heavily, rising tired and cross. The disposition is altered for the worse by stimulants, coffee, spices, and the loss of sleep.
          </p>
          <p style={{ margin: "0 0 14px" }}>
            Constipation is characteristic: ineffectual urging, a little stool passed with great straining, and a sense that much remains. The abdomen is distended after eating; clothes must be loosened.
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AnalysisMatrix, RemedyDetail, LecturePanel, MOCK_RUBRICS, REMEDIES, computeResults });
