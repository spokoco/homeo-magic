"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRepertorize } from "./useRepertorize";
import chroma from "chroma-js";
import { MateriaPanel } from "./MateriaPanel";
import { LecturePanel } from "./LecturePanel";

// Color scale for score heat-mapping
const defaultScale = () => chroma.scale(["#fef3c7", "#fca5a5"]).mode("lab");

function useColorScale() {
  const [scaleRef, setScaleRef] = useState<{ fn: ReturnType<typeof chroma.scale>; colors?: string[] }>(() => ({ fn: defaultScale() }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem("homeo-magic-color-scale");
      if (!raw) return;
      const data = JSON.parse(raw);
      const scale = data.scale;
      if (Array.isArray(scale) && scale.length >= 3) {
        setScaleRef({ fn: chroma.scale(scale).mode(data.mode || "lab"), colors: scale });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!scaleRef.colors) return;
    let styleEl = document.getElementById("dynamic-grade-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-grade-styles";
      document.head.appendChild(styleEl);
    }
    let css = "";
    for (let i = 0; i < scaleRef.colors.length; i++) {
      const bg = scaleRef.colors[i];
      const fg = getTextColor(bg);
      css += `.grade-${i + 1} { background: ${bg} !important; color: ${fg} !important; }\n`;
    }
    styleEl.textContent = css;
  }, [scaleRef]);

  const getScoreColor = useCallback(
    (t: number) => scaleRef.fn(t).hex(),
    [scaleRef]
  );

  return { getScoreColor };
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function getTextColor(bgHex: string): string {
  const [r, g, b] = chroma(bgHex).rgb();
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#1f2937" : "#ffffff";
}

export default function Home() {
  const {
    loading,
    error,
    loadProgress,
    rubrics,
    remedies,
    selectedRubrics,
    hiddenRubrics,
    results,
    minScore,
    setMinScore,
    searchRubrics,
    addRubric,
    removeRubric,
    hideRubric,
    showRubric,
    clearRubrics,
    reorderRubrics,
    rubricCount,
    remedyCount,
  } = useRepertorize();

  const isMobile = useIsMobile();
  const dragRef = useRef<{ index: number } | null>(null);
  const [rubricColWidth, setSymColWidth] = useState(420);

  // On mobile, force rubric column to 50vw and reset on desktop
  useEffect(() => {
    if (isMobile) {
      setSymColWidth(Math.round(window.innerWidth * 0.5));
    } else {
      setSymColWidth(420);
    }
  }, [isMobile]);
  const [hoveredRemedy, setHoveredRemedy] = useState<string | null>(null);
  const [selectedRemedy, setSelectedRemedy] = useState<string | null>(null);
  const [hoveredRubricRow, setHoveredSymRow] = useState<string | null>(null);
  const [selectedRubricRow, setSelectedSymRow] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [highlightPassage, setHighlightPassage] = useState<string | null>(null);

  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startWidth: rubricColWidth };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = ev.clientX - resizeRef.current.startX;
      const newWidth = Math.max(200, Math.min(800, resizeRef.current.startWidth + diff));
      setSymColWidth(newWidth);
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [rubricColWidth]);

  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [remedyDetail, setRemedyDetail] = useState<string | null>(null);
  const [rubricDetail, setRubricDetail] = useState<string | null>(null);
  const [isRubricPanelOpen, setIsRubricPanelOpen] = useState(true);
  const [isRemedyPanelOpen, setIsRemedyPanelOpen] = useState(true);
  const [isLecturePanelOpen, setIsLecturePanelOpen] = useState(true);

  // Auto-select top remedy when results first appear
  useEffect(() => {
    if (results.items.length > 0 && !remedyDetail) {
      setRemedyDetail(results.items[0].abbrev);
      setIsRemedyPanelOpen(true);
      setIsLecturePanelOpen(true);
    }
  }, [results.items.length > 0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { getScoreColor } = useColorScale();

  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchRubrics(query, 50);
  }, [query, searchRubrics]);
  const showDropdown = dropdownOpen && suggestions.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Escape") setDropdownOpen(false);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((p) =>
          p < suggestions.length - 1 ? p + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((p) =>
          p > 0 ? p - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) handleSelectSuggestion(suggestions[highlightedIndex]);
        break;
      case "Escape":
        setDropdownOpen(false);
        break;
    }
  }

  function handleSelectSuggestion(rubric: string) {
    addRubric(rubric);
    setQuery("");
    setDropdownOpen(false);
    inputRef.current?.focus();
  }

  // Filter and limit results
  const filtered = results.items.filter((r) => r.totalScore >= minScore);
  const displayed = filtered.slice(0, 40);

  return (
    <div className="hm-shell">
      <header className={`mb-6 flex items-start justify-between gap-4 ${isMobile ? "flex-col" : ""}`}>
        <div className="min-w-0">
          <div className="hm-eyebrow mb-3" style={{ color: "var(--fg-inverse)" }}>Repertorization matrix</div>
          <div className={`flex items-center gap-4 ${isMobile ? "flex-wrap" : ""}`}>
            <Image src="/logo-lockup.svg" alt="Homeo-Magic" width={220} height={44} className="h-11 w-auto max-w-full" priority />
            {loadProgress.phase === "index" && (
              <div className="hm-tag inline-flex items-center gap-2 px-3 py-1.5 text-[13px] loading-pulse">
                <span className="h-2 w-2 rounded-full bg-[var(--teal)]" />
                Loading index
              </div>
            )}
          </div>
          <p className="mt-4 max-w-3xl text-[15px] leading-6 text-[var(--fg-inverse)]">
            Search and select rubrics to find matching remedies. The matrix stays central; the reading panels stay quiet.
          </p>
        </div>
        <div className={`hm-soft-card flex items-center gap-3 px-4 py-3 text-[15px] ${isMobile ? "w-full flex-wrap" : ""}`}>
          <span className="text-[var(--fg-2)]">
            {loading ? (
              <span className="loading-pulse">{loadProgress.message}</span>
            ) : error ? (
              <span className="text-[#a23b2a]">Error: {error}</span>
            ) : (
              <>
                {rubricCount.toLocaleString()} rubrics &middot;{" "}
                {remedyCount.toLocaleString()} remedies
              </>
            )}
          </span>
          <a
            href="design-system.html"
            className="hm-action-button hm-action-button--secondary inline-flex items-center gap-2 px-3 py-2 text-[14px] font-semibold no-underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M3 12h18" />
              <path d="M5.5 5.5l13 13" />
              <path d="M18.5 5.5l-13 13" />
            </svg>
            Design Colors
          </a>
          <a
            href="settings.html"
            className="hm-action-button hm-action-button--secondary inline-flex items-center gap-2 px-3 py-2 text-[14px] font-semibold no-underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Color Settings
          </a>
        </div>
      </header>

      <div className="hm-panel">
        <div className="hm-panel-header" style={{ background: "var(--shell-bg)" }}>
          <div className="hm-eyebrow mb-2" style={{ color: "var(--fg-inverse)" }}>Add rubrics</div>
          <label htmlFor="search" className="block text-[16px] font-semibold text-[var(--fg-inverse)] mb-3">
            Type to search the repertory
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="search"
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length > 0) setDropdownOpen(true); }}
              placeholder="Type to search (e.g., headache, anxiety, burning)..."
              className="hm-input px-[18px] py-[14px] text-base outline-none transition-all font-inherit disabled:cursor-not-allowed disabled:bg-[var(--bg-sunken)]"
              autoComplete="off"
              disabled={loading}
            />
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-[300px] overflow-y-auto rounded-[14px] border border-[var(--border-accent)] bg-[var(--paper)] shadow-[var(--shadow-lg)]"
              >
                {suggestions.map((rubric, idx) => (
                  <button
                    key={rubric}
                    ref={idx === highlightedIndex ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                    onClick={() => handleSelectSuggestion(rubric)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full cursor-pointer border-b border-[var(--border)] px-4 py-3 text-left text-sm text-[var(--fg-1)] transition-colors last:border-b-0 ${
                      idx === highlightedIndex ? "bg-[var(--teal-soft)]" : "hover:bg-[var(--ink-04)]"
                    }`}
                  >
                    <HighlightMatch text={rubric} query={query} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedRubrics.length === 0 ? (
          <div className="hm-empty-state px-6 py-16 text-center">
            <Image src="/mark.svg" alt="" width={56} height={56} className="mx-auto mb-4 h-14 w-14 opacity-90" />
            <p className="text-[16px] text-[var(--fg-2)]">Search and select rubrics above to find matching remedies</p>
          </div>
        ) : results.items.length === 0 ? (
          <div className="hm-empty-state px-6 py-16 text-center">
            <p className="text-[16px] text-[var(--fg-2)]">No remedies found for these rubrics</p>
          </div>
        ) : (
          <>
            <div className={`flex items-center border-b border-[var(--border)] bg-[var(--bg-sunken)] py-3 ${isMobile ? "flex-wrap gap-2 px-3" : ""}`}>
              {!isMobile && (
                <div className="px-5 text-[16px] font-semibold whitespace-nowrap text-[var(--fg-accent)]" style={{ width: rubricColWidth, minWidth: 420, flexShrink: 0 }}>
                  Analysis
                </div>
              )}
              {isMobile && (
                <div className="px-5 text-[16px] font-semibold whitespace-nowrap text-[var(--fg-accent)]">
                  Analysis
                </div>
              )}
              <div className="flex items-center gap-4 px-2">
                <span className="text-[16px] font-medium whitespace-nowrap text-[var(--fg-1)]">
                  Showing {displayed.length} of {results.totalCount}{" "}remedies
                  {filtered.length > displayed.length &&
                    ` \u2022 ${filtered.length - displayed.length} more below`}
                </span>
              </div>
              <div className={`flex items-center gap-3 ${isMobile ? "" : "ml-auto"} pr-5`}>
                <label className="text-[16px] font-medium whitespace-nowrap text-[var(--fg-1)]">
                  Min score:
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value))}
                  className="score-slider w-[120px]"
                  style={{
                    direction: "rtl",
                    background: `linear-gradient(to right, ${getScoreColor(minScore / 100)} ${100 - minScore}%, var(--border) ${100 - minScore}%)`,
                  }}
                />
                <span
                  className="rounded px-2 py-0.5 text-center text-sm font-bold"
                  style={{
                    minWidth: 35,
                    background: getScoreColor(minScore / 100),
                    color: getTextColor(getScoreColor(minScore / 100)),
                  }}
                >
                  {minScore}
                </span>
                <button
                  onClick={() => setMinScore(0)}
                  className="hm-action-button hm-action-button--secondary px-3 py-1.5 text-xs font-medium cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Table */}
            <div ref={tableWrapRef} className="overflow-x-auto max-h-[70vh] relative">
              {/* Single full-height resize handle overlay */}
              <div
                className="absolute top-0 bottom-0 z-30 w-[6px] cursor-col-resize transition-colors hover:bg-[var(--teal)]"
                style={{ left: rubricColWidth - 3, pointerEvents: "auto" }}
                onMouseDown={startResize}
              />
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th
                      className="sticky top-0 left-0 z-20 border-b border-[var(--border-strong)] bg-[var(--bg-herb)] px-5 py-2.5 text-right text-[16px] font-semibold text-[var(--fg-accent)]"
                      style={{ width: rubricColWidth, minWidth: isMobile ? 100 : 420, maxWidth: 800 }}
                    >
                      Remedies
                    </th>
                    {displayed.map((r) => (
                      <th
                        key={r.abbrev}
                        onClick={() => {
                          setSelectedRemedy((prev) => prev === r.abbrev ? null : r.abbrev);
                          setRemedyDetail(r.abbrev);
                          setIsRemedyPanelOpen(true);
                          setIsLecturePanelOpen(true);
                        }
                        }
                        onMouseEnter={() => setHoveredRemedy(r.abbrev)}
                        onMouseLeave={() => setHoveredRemedy(null)}
                        className="sticky top-0 z-10 cursor-pointer border-b border-[var(--border-strong)] px-1 pt-2.5 pb-[10px] text-center font-semibold text-[var(--fg-accent)] transition-colors"
                        style={{
                          writingMode: "vertical-rl",
                          textOrientation: "mixed",
                          transform: "rotate(180deg)",
                          height: "100px",
                          verticalAlign: "middle",
                          fontSize: "16px",
                          whiteSpace: "nowrap",
                          background: (hoveredRemedy === r.abbrev || selectedRemedy === r.abbrev) ? "var(--teal-soft)" : "var(--bg-sunken)",
                        }}
                      >
                        {r.abbrev}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Score row */}
                  <tr>
                    <td className="sticky left-0 z-10 border-b-2 border-[var(--border-strong)] bg-[var(--bg-sunken)] px-5 py-2.5 text-[16px] font-semibold">
                      <div className="flex items-center">
                        <span className="text-[var(--fg-accent)]">Rubrics</span>
                        <span className="ml-auto flex items-center gap-2">
                          {selectedRubrics.length > 0 && (
                            <button
                              onClick={() => setShowClearConfirm(true)}
                              className="inline-flex items-center gap-1.5 bg-transparent p-0 text-sm font-medium cursor-pointer text-[var(--fg-2)] transition-colors hover:text-[var(--fg-1)]"
                              data-testid="clear-all-rubrics"
                            >
                              Clear All ({selectedRubrics.length})
                            </button>
                          )}
                        </span>
                        <span className="ml-2">Score</span>
                      </div>
                    </td>
                    {displayed.map((r) => {
                      const bg = getScoreColor(r.totalScore / 100);
                      const fg = getTextColor(bg);
                      return (
                        <td
                          key={r.abbrev}
                          onClick={() => setMinScore(r.totalScore)}
                          className="cursor-pointer border-b-2 border-[var(--border-strong)] px-2 py-2.5 text-center text-[16px] font-bold transition-colors"
                          style={{
                            background: bg,
                            color: fg,
                            boxShadow: (hoveredRemedy === r.abbrev || selectedRemedy === r.abbrev) ? "inset 0 0 0 2px var(--teal-deep)" : undefined,
                          }}
                          title={`Click to set minimum score to ${r.totalScore}`}
                        >
                          {r.totalScore}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Rubric rows */}
                  {selectedRubrics.map((sym, rubricIndex) => {
                    const isHidden = hiddenRubrics.has(sym);
                    const rubricData = rubrics?.[sym];
                    const rubricRemedyCount = rubricData
                      ? Object.keys(rubricData.remedies).length
                      : 0;
                    return (
                      <tr
                        key={sym}
                        draggable
                        onDragStart={(e) => {
                          dragRef.current = { index: rubricIndex };
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragRef.current !== null) {
                            reorderRubrics(dragRef.current.index, rubricIndex);
                            dragRef.current = null;
                          }
                        }}
                        onDragEnd={() => { dragRef.current = null; }}
                        onMouseEnter={() => setHoveredSymRow(sym)}
                        onMouseLeave={() => setHoveredSymRow(null)}
                        style={{
                          opacity: isHidden ? 0.4 : 1,
                          transition: "opacity 0.15s, background 0.15s",
                          background: (selectedRubricRow === sym || hoveredRubricRow === sym) ? "var(--ink-04)" : undefined,
                        }}
                      >
                        <td
                          onClick={() => {
                            setSelectedSymRow((prev) => prev === sym ? null : sym);
                            setRubricDetail((prev) => prev === sym ? null : sym);
                            setIsRubricPanelOpen(true);
                          }}
                          className="sticky left-0 z-10 cursor-pointer border-b border-[var(--border)] px-5 py-2.5 text-left text-[15px] transition-colors"
                          style={{
                            background: (selectedRubricRow === sym || hoveredRubricRow === sym) ? "var(--ink-04)" : "var(--paper)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="flex-shrink-0 cursor-grab text-[var(--ink-30)]"
                              style={{ opacity: hoveredRubricRow === sym ? 1 : 0, transition: "opacity 0.15s", marginLeft: "-20px", marginRight: "4px" }}
                              title="Drag to reorder"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="4" r="2"/><circle cx="15" cy="4" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/></svg>
                            </span>
                            <span className="flex-1" style={isHidden ? { textDecoration: "line-through", color: "var(--ink-30)" } : undefined}>{sym}</span>
                            <span className="text-[15px] text-[var(--ink-30)]">
                              {rubricRemedyCount}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isHidden) {
                                  showRubric(sym);
                                } else {
                                  hideRubric(sym);
                                }
                              }}
                              className="hm-icon-button flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center text-xs cursor-pointer"
                              style={{ opacity: hoveredRubricRow === sym ? 1 : 0, transition: "opacity 0.15s" }}
                              title={isHidden ? "Show rubric" : "Hide rubric"}
                            >
                              {isHidden ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRubric(sym);
                              }}
                              className="hm-icon-button flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center text-xs cursor-pointer"
                              style={{ opacity: hoveredRubricRow === sym ? 1 : 0, transition: "opacity 0.15s" }}
                              title="Remove rubric"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                        {displayed.map((r) => {
                          const grade = isHidden ? null : r.breakdown[sym];
                          return (
                            <td
                              key={r.abbrev}
                              className="border-b border-[var(--border)] px-2 py-2.5 text-center"
                              style={{
                                background:
                                  ((hoveredRemedy === r.abbrev || selectedRemedy === r.abbrev) && (hoveredRubricRow === sym || selectedRubricRow === sym))
                                    ? "var(--teal-soft)"
                                    : (hoveredRemedy === r.abbrev || selectedRemedy === r.abbrev || hoveredRubricRow === sym || selectedRubricRow === sym)
                                      ? "var(--ink-04)"
                                      : undefined,
                              }}
                            >
                              {grade ? (
                                <span className={`grade grade-${grade}`}>
                                  {grade}
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>

      {/* Detail panel + Lecture panel side by side - OUTSIDE the analysis panel */}
      {(rubricDetail || remedyDetail) && (
        <div className="mt-5 space-y-5">
          {rubricDetail && (
            <div className="flex min-w-0 w-full">
              <DetailPanel
                type="rubric"
                name={rubricDetail}
                rubrics={rubrics}
                remedies={remedies}
                selectedRubrics={selectedRubrics}
                selectedRemedy={selectedRemedy}
                isOpen={isRubricPanelOpen}
                onToggleOpen={() => setIsRubricPanelOpen((prev) => !prev)}
                onShowRemedyDetail={(name) => {
                  setSelectedRemedy(name);
                  setRemedyDetail(name);
                  setIsRemedyPanelOpen(true);
                  setIsLecturePanelOpen(true);
                }}
                onPassageClick={(passage) => setHighlightPassage(passage)}
                selectedPassage={highlightPassage}
              />
            </div>
          )}
          {remedyDetail && (
            <div className={`flex gap-5 items-stretch ${isMobile ? "flex-col" : ""}`}>
              <div className={`${isMobile ? "w-full" : "w-1/2"} min-w-0 flex`}>
                <DetailPanel
                  type="remedy"
                  name={remedyDetail}
                  rubrics={rubrics}
                  remedies={remedies}
                  selectedRubrics={selectedRubrics}
                  selectedRemedy={selectedRemedy}
                  isOpen={isRemedyPanelOpen}
                  onToggleOpen={() => setIsRemedyPanelOpen((prev) => !prev)}
                  onShowRemedyDetail={(name) => {
                    setSelectedRemedy(name);
                    setRemedyDetail(name);
                    setIsRemedyPanelOpen(true);
                    setIsLecturePanelOpen(true);
                  }}
                  onPassageClick={(passage) => setHighlightPassage(passage)}
                  selectedPassage={highlightPassage}
                />
              </div>
              <div className={`${isMobile ? "w-full" : "w-1/2"} hm-panel min-w-0 animate-slide-up flex flex-col`}>
                <div className="hm-panel-header font-semibold" style={{ background: "var(--shell-bg)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <span>Lecture</span>
                    <button
                      onClick={() => setIsLecturePanelOpen((prev) => !prev)}
                      className="cursor-pointer border-none bg-transparent text-[var(--fg-muted-on-ink)] transition-colors hover:text-[var(--fg-inverse)]"
                      title={isLecturePanelOpen ? "Collapse panel" : "Expand panel"}
                    >
                      <span className="sr-only">{isLecturePanelOpen ? "Collapse panel" : "Expand panel"}</span>
                      <ChevronIcon direction={isLecturePanelOpen ? "up" : "down"} />
                    </button>
                  </div>
                </div>
                {isLecturePanelOpen ? (
                  <LecturePanel
                    remedyAbbrev={remedyDetail}
                    selectedRubrics={selectedRubrics}
                    highlightPassage={highlightPassage ?? undefined}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear All confirmation modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "var(--dialog-backdrop)" }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-[14px] border border-[var(--border)] bg-[var(--paper)] p-6 shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-[var(--fg-1)]">Clear all rubrics?</h3>
            <p className="mb-5 text-sm text-[var(--fg-2)]">
              This will remove all {selectedRubrics.length} selected rubrics and reset the analysis.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="hm-action-button hm-action-button--secondary px-4 py-2 text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearRubrics();
                  setSelectedRemedy(null);
                  sessionStorage.removeItem("homeo-magic-state");
                  setShowClearConfirm(false);
                }}
                className="hm-action-button rounded-lg border border-transparent bg-[#a23b2a] px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors hover:bg-[#842f22]"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="hm-highlight">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function DetailPanel({
  type,
  name,
  rubrics,
  remedies,
  selectedRubrics,
  selectedRemedy,
  isOpen,
  onToggleOpen,
  onShowRemedyDetail,
  onPassageClick,
  selectedPassage,
}: {
  type: "remedy" | "rubric";
  name: string;
  rubrics: Record<string, { remedies: Record<string, number> }> | null;
  remedies: Record<string, string> | null;
  selectedRubrics: string[];
  selectedRemedy: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  onShowRemedyDetail: (name: string) => void;
  onPassageClick?: (passage: string) => void;
  selectedPassage?: string | null;
}) {
  return (
    <div className="hm-panel animate-slide-up w-full">
      <div className="hm-panel-header font-semibold" style={{ background: "var(--shell-bg)" }}>
        <div className="flex items-center justify-between gap-3">
          <span>{type === "remedy" ? "Remedy" : "Rubric"}</span>
          <button
            onClick={onToggleOpen}
            className="cursor-pointer border-none bg-transparent text-[var(--fg-muted-on-ink)] transition-colors hover:text-[var(--fg-inverse)]"
            title={isOpen ? "Collapse panel" : "Expand panel"}
          >
            <span className="sr-only">{isOpen ? "Collapse panel" : "Expand panel"}</span>
            <ChevronIcon direction={isOpen ? "up" : "down"} />
          </button>
        </div>
      </div>
      {isOpen ? (
      <div className="p-5 text-[15px] leading-relaxed text-[var(--fg-2)]">
        {type === "remedy" ? (
          <>
            <div className="mb-2 text-2xl font-bold text-[var(--fg-1)]">
              {remedies?.[name] || name}
            </div>
            <div className="mb-4 text-sm text-[var(--fg-2)]">
              Abbreviation: {name}
            </div>
            <MateriaPanel
              remedyAbbrev={name}
              selectedRubrics={selectedRubrics}
              grades={(() => {
                // Get grade breakdown from rubric data
                const grades: Record<string, number> = {};
                if (rubrics) {
                  for (const sym of selectedRubrics) {
                    const rubricData = rubrics[sym];
                    if (rubricData?.remedies?.[name]) {
                      grades[sym] = rubricData.remedies[name];
                    }
                  }
                }
                return grades;
              })()}
              onPassageClick={onPassageClick}
              selectedPassage={selectedPassage ?? undefined}
            />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-[var(--fg-1)]">{name}</div>
            {rubrics?.[name] && (
              <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[var(--fg-2)]">
                <strong>
                  {Object.keys(rubrics[name].remedies).length}
                </strong>{" "}
                remedies cover this rubric
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(rubrics[name].remedies)
                    .sort((a, b) => b[1] - a[1])
                    .map(([rem, grade]) => (
                      <span
                        key={rem}
                        onClick={() => onShowRemedyDetail(rem)}
                        className={`grade-${grade} cursor-pointer rounded-[999px] px-2.5 py-1 text-[16px] font-medium ${
                          selectedRemedy === rem ? "border-2 border-[var(--teal)]" : "border-2 border-transparent"
                        }`}
                      >
                        {rem} ({grade})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {direction === "up" ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}
