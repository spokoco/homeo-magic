"use client";

import { useState, useEffect } from "react";
import type { ProfilesData, SymptomIndexData, MateriaProfile } from "./types";

let cachedProfiles: ProfilesData | null = null;
let cachedSymptomIndex: SymptomIndexData | null = null;
let cachedArchiveLinks: Record<string, { leaf: number; url: string }> | null = null;

/** Reset the module-level cache (for testing) */
export function resetMateriaCache() {
  cachedProfiles = null;
  cachedSymptomIndex = null;
  cachedArchiveLinks = null;
}

async function loadMateriaData(): Promise<{
  profiles: ProfilesData | null;
  symptomIndex: SymptomIndexData | null;
  archiveLinks: Record<string, { leaf: number; url: string }> | null;
}> {
  if (cachedProfiles && cachedSymptomIndex) {
    return { profiles: cachedProfiles, symptomIndex: cachedSymptomIndex, archiveLinks: cachedArchiveLinks };
  }
  try {
    const [profilesRes, indexRes, linksRes] = await Promise.all([
      fetch("/data/kent/profiles.json"),
      fetch("/data/kent/symptom_index.json"),
      fetch("/data/kent/archive_links.json"),
    ]);
    if (!profilesRes.ok || !indexRes.ok) throw new Error("Failed to load");
    const profiles = (await profilesRes.json()) as ProfilesData;
    const symptomIndex = (await indexRes.json()) as SymptomIndexData;
    const archiveLinks = linksRes.ok ? await linksRes.json() : null;
    cachedProfiles = profiles;
    cachedSymptomIndex = symptomIndex;
    cachedArchiveLinks = archiveLinks;
    return { profiles, symptomIndex, archiveLinks };
  } catch {
    return { profiles: null, symptomIndex: null, archiveLinks: null };
  }
}

/**
 * Search remedy markdown text for passages matching the selected symptoms.
 * Extracts ~200 chars of surrounding context for each match.
 */
function findPassagesInText(text: string, symptoms: string[]): Record<string, string> {
  const results: Record<string, string> = {};
  const textLower = text.toLowerCase();

  for (const sym of symptoms) {
    // Extract search keywords from the symptom path
    const parts = sym.split(",").map(s => s.trim().toLowerCase());
    // Use the most specific parts (skip very generic ones)
    const keywords = parts
      .filter(p => p.length > 2)
      .flatMap(p => p.replace(/[()]/g, "").split(/\s+/))
      .filter(w => w.length > 3 && !["with", "from", "morbid", "desire"].includes(w));

    if (keywords.length === 0) continue;

    // Search for the best matching passage
    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < textLower.length - 50; i += 20) {
      const window = textLower.slice(i, i + 300);
      let score = 0;
      for (const kw of keywords) {
        if (window.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestScore >= 1 && bestIdx >= 0) {
      // Extract context around the match
      const start = Math.max(0, bestIdx - 50);
      const end = Math.min(text.length, bestIdx + 250);
      let passage = text.slice(start, end).trim();

      // Clean up: start at a word boundary
      const firstSpace = passage.indexOf(" ");
      if (start > 0 && firstSpace > 0 && firstSpace < 20) {
        passage = passage.slice(firstSpace + 1);
      }
      // End at a sentence boundary if possible
      const lastPeriod = passage.lastIndexOf(".");
      if (lastPeriod > passage.length * 0.5) {
        passage = passage.slice(0, lastPeriod + 1);
      }

      // Strip markdown formatting
      passage = passage.replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/\*/g, "");

      results[sym] = passage;
    }
  }

  return results;
}

export function MateriaPanel({
  remedyAbbrev,
  selectedSymptoms,
}: {
  remedyAbbrev: string;
  selectedSymptoms: string[];
}) {
  const [profile, setProfile] = useState<MateriaProfile | null>(null);
  const [passages, setPassages] = useState<Record<string, string> | null>(null);
  const [archiveUrl, setArchiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    loadMateriaData().then(async ({ profiles, symptomIndex, archiveLinks }) => {
      if (cancelled) return;
      if (!profiles || !profiles[remedyAbbrev]) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const prof = profiles[remedyAbbrev];
      setProfile(prof);

      // Start with pre-computed passages
      const preComputed = symptomIndex?.[remedyAbbrev] ?? {};

      // Load the remedy markdown for live keyword matching
      let liveMatches: Record<string, string> = {};
      try {
        const mdRes = await fetch(`/data/kent/remedy_markdown/${prof.file}`);
        if (mdRes.ok) {
          const mdText = await mdRes.text();
          liveMatches = findPassagesInText(mdText, selectedSymptoms);
        }
      } catch { /* ignore */ }

      // Merge: pre-computed takes priority, then live keyword matches
      const merged: Record<string, string> = {};
      for (const sym of selectedSymptoms) {
        if (preComputed[sym]) {
          merged[sym] = preComputed[sym];
        } else if (liveMatches[sym]) {
          merged[sym] = liveMatches[sym];
        } else {
          // Try fuzzy match on pre-computed keys
          const symParts = sym.toLowerCase().split(",").map(s => s.trim());
          let found = false;
          for (const [key, val] of Object.entries(preComputed)) {
            const keyParts = key.toLowerCase().split(",").map(s => s.trim());
            const shorter = symParts.length <= keyParts.length ? symParts : keyParts;
            const longer = symParts.length <= keyParts.length ? keyParts : symParts;
            if (shorter.every(p => longer.some(lp => lp.includes(p) || p.includes(lp)))) {
              merged[sym] = val;
              found = true;
              break;
            }
          }
          if (!found) {
            merged[sym] = "";
          }
        }
      }
      setPassages(merged);

      // Find archive link
      if (archiveLinks && prof) {
        const remedyName = prof.remedy;
        if (archiveLinks[remedyName]) {
          setArchiveUrl(archiveLinks[remedyName].url);
        }
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [remedyAbbrev]);

  if (loading) {
    return (
      <div className="py-6 text-center text-[#6b7280] text-sm">
        Loading materia medica...
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="py-6 text-center text-[#6b7280] text-sm italic">
        No materia medica data available for this remedy.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Symptom Cross-References */}
      {selectedSymptoms.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[#065774] uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Symptom Cross-References
          </h3>
          <div className="space-y-3">
            {selectedSymptoms.map((sym) => {
              const passage = passages?.[sym];
              return (
                <div
                  key={sym}
                  className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3"
                >
                  <div className="font-semibold text-[#1f2937] text-sm mb-1">
                    {sym}
                  </div>
                  {passage ? (
                    <p className="text-[13px] text-[#374151] leading-relaxed italic">
                      &ldquo;{passage}&rdquo;
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#9ca3af] italic">
                      No specific passage found.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Constitutional Profile */}
      <section>
        <h3 className="text-sm font-semibold text-[#065774] uppercase tracking-wide mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Constitutional Profile
        </h3>
        <div className="space-y-3">
          <ProfileField label="Personality" text={profile.personality} />
          <ProfileField label="Mental State" text={profile.mental_state} />
          <ProfileField
            label="Emotional Pattern"
            text={profile.emotional_pattern}
          />
        </div>
      </section>

      {/* 3. Book Link */}
      <section>
        <h3 className="text-sm font-semibold text-[#065774] uppercase tracking-wide mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Full Book Text
        </h3>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/data/kent/remedy_markdown/${profile.file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#065774] text-white rounded-lg text-sm font-medium hover:bg-[#042B58] transition-colors no-underline"
          >
            Read full Kent lecture: {profile.remedy}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
          {archiveUrl && (
            <a
              href={archiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8B4513] text-white rounded-lg text-sm font-medium hover:bg-[#6B3410] transition-colors no-underline"
            >
              View original in Internet Archive
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileField({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
      <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">
        {label}
      </div>
      <p className="text-[13px] text-[#374151] leading-relaxed m-0">{text}</p>
    </div>
  );
}
