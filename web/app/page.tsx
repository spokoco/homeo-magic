"use client";

import { useState, useRef, useEffect } from "react";
import { useRepertorize } from "./useRepertorize";
import type { RepertoResult } from "./types";

export default function Home() {
  const {
    loading,
    error,
    selectedSymptoms,
    results,
    searchSymptoms,
    addSymptom,
    removeSymptom,
    clearSymptoms,
    symptomCount,
    remedyCount,
  } = useRepertorize();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update suggestions when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      const matches = searchSymptoms(query, 50);
      setSuggestions(matches);
      setShowDropdown(matches.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [query, searchSymptoms]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowDropdown(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        break;
    }
  }

  function handleSelectSuggestion(symptom: string) {
    addSymptom(symptom);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🔮</div>
          <p className="text-lg text-purple-600 dark:text-purple-400">
            Loading repertory data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600 dark:text-red-400">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-800 dark:text-purple-300 flex items-center justify-center gap-3">
            <span className="text-5xl">🔮</span>
            Homeo-Magic
          </h1>
          <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
            {symptomCount.toLocaleString()} symptoms •{" "}
            {remedyCount.toLocaleString()} remedies
          </p>
        </header>

        {/* Search Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-purple-200 dark:border-purple-800">
          <label
            htmlFor="symptom-search"
            className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2"
          >
            Enter symptoms:
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="symptom-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowDropdown(true);
              }}
              placeholder="Type to search symptoms (e.g., headache, morning, irritability)..."
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 dark:border-purple-600 
                         bg-purple-50 dark:bg-gray-800 
                         focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 
                         outline-none transition-all text-lg"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 p-1"
                title="Clear search"
              >
                ✕
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border-2 border-purple-300 dark:border-purple-600 
                           rounded-lg shadow-xl max-h-80 overflow-y-auto"
              >
                {suggestions.map((symptom, idx) => (
                  <button
                    key={symptom}
                    onClick={() => handleSelectSuggestion(symptom)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-purple-100 dark:hover:bg-purple-900 
                               transition-colors border-b border-purple-100 dark:border-purple-800 last:border-b-0
                               ${
                                 idx === highlightedIndex
                                   ? "bg-purple-100 dark:bg-purple-900"
                                   : ""
                               }`}
                  >
                    {highlightQuery(symptom, query)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Symptoms */}
          {selectedSymptoms.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Selected ({selectedSymptoms.length}):
                </span>
                <button
                  onClick={clearSymptoms}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm 
                               bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200
                               border border-purple-300 dark:border-purple-600"
                  >
                    <span className="max-w-xs truncate" title={symptom}>
                      {symptom}
                    </span>
                    <button
                      onClick={() => removeSymptom(symptom)}
                      className="ml-1 hover:text-red-600 dark:hover:text-red-400 font-bold"
                      title="Remove symptom"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800">
          <div className="px-6 py-4 border-b border-purple-200 dark:border-purple-800">
            <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-300">
              {selectedSymptoms.length === 0 ? (
                "Remedies"
              ) : results.length === 0 ? (
                "No remedies found in intersection"
              ) : (
                <>
                  Remedies ({results.length} found)
                </>
              )}
            </h2>
          </div>

          {selectedSymptoms.length === 0 ? (
            <div className="px-6 py-12 text-center text-purple-500 dark:text-purple-400">
              <p className="text-lg">Select symptoms above to find matching remedies</p>
              <p className="text-sm mt-2 opacity-75">
                Remedies appearing in ALL selected symptoms will be shown, ranked by total score
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-12 text-center text-purple-500 dark:text-purple-400">
              <p className="text-lg">No remedies appear in all selected symptoms</p>
              <p className="text-sm mt-2 opacity-75">
                Try removing a symptom to broaden the search
              </p>
            </div>
          ) : (
            <div className="divide-y divide-purple-100 dark:divide-purple-800 max-h-[500px] overflow-y-auto">
              {results.map((result, idx) => (
                <ResultRow key={result.abbrev} result={result} rank={idx + 1} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-purple-500 dark:text-purple-400 opacity-75">
          Repertorization finds remedies present in the intersection of all symptoms.
          <br />
          Scores are summed from individual symptom weights (1-3).
        </footer>
      </div>
    </div>
  );
}

// Highlight matching query text
function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

// Result row component
function ResultRow({ result, rank }: { result: RepertoResult; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  // Create breakdown string
  const breakdownStr = Object.entries(result.breakdown)
    .map(([symptom, weight]) => {
      // Shorten symptom name for display
      const shortName = symptom.split(",")[0];
      return `${shortName}(${weight})`;
    })
    .join(" + ");

  return (
    <div className="px-6 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-purple-400 dark:text-purple-500 w-8 text-right font-mono">
          {rank}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-purple-800 dark:text-purple-200">
              {result.abbrev}
            </span>
            <span className="text-purple-500 dark:text-purple-400 text-sm">
              ({result.fullName})
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-purple-400 dark:text-purple-500 hover:text-purple-600 dark:hover:text-purple-300 mt-1"
          >
            {expanded ? "▼" : "▶"} {breakdownStr}
          </button>
          {expanded && (
            <div className="mt-2 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/50 rounded p-3">
              {Object.entries(result.breakdown).map(([symptom, weight]) => (
                <div key={symptom} className="flex justify-between py-0.5">
                  <span className="truncate mr-4">{symptom}</span>
                  <span className="font-mono font-semibold">{weight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {result.totalScore}
          </span>
          <span className="text-sm text-purple-500 dark:text-purple-400 ml-1">
            pts
          </span>
        </div>
      </div>
    </div>
  );
}
