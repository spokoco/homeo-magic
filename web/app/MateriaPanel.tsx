"use client";
import { dataUrl, navUrl } from "./dataUrl";

import { useState, useEffect } from "react";
import type { ProfilesData, RubricIndexData, MateriaProfile } from "./types";

let cachedProfiles: ProfilesData | null = null;
let cachedRubricIndex: RubricIndexData | null = null;
let cachedArchiveLinks: Record<string, { leaf: number; url: string }> | null = null;
let cachedPassageIndex: Record<string, Array<{ keywords: string[]; passage: string }>> | null = null;

/** Reset the module-level cache (for testing) */
export function resetMateriaCache() {
  cachedProfiles = null;
  cachedRubricIndex = null;
  cachedArchiveLinks = null;
  cachedPassageIndex = null;
}

async function loadMateriaData(): Promise<{
  profiles: ProfilesData | null;
  rubricIndex: RubricIndexData | null;
  archiveLinks: Record<string, { leaf: number; url: string }> | null;
}> {
  if (cachedProfiles && cachedRubricIndex) {
    return { profiles: cachedProfiles, rubricIndex: cachedRubricIndex, archiveLinks: cachedArchiveLinks };
  }
  try {
    const [profilesRes, indexRes, linksRes, passagesRes] = await Promise.all([
      fetch(dataUrl("data/kent/profiles.json")),
      fetch(dataUrl("data/kent/rubric_index.json")),
      fetch(dataUrl("data/kent/archive_links.json")),
      fetch(dataUrl("data/kent/passage_index.json")),
    ]);
    if (!profilesRes.ok || !indexRes.ok) throw new Error("Failed to load");
    const profiles = (await profilesRes.json()) as ProfilesData;
    const rubricIndex = (await indexRes.json()) as RubricIndexData;
    const archiveLinks = linksRes.ok ? await linksRes.json() : null;
    const passageIndex = passagesRes.ok ? await passagesRes.json() : null;
    cachedProfiles = profiles;
    cachedRubricIndex = rubricIndex;
    cachedArchiveLinks = archiveLinks;
    cachedPassageIndex = passageIndex;
    return { profiles, rubricIndex, archiveLinks };
  } catch {
    return { profiles: null, rubricIndex: null, archiveLinks: null };
  }
}

/**
 * Match selected rubrics against the pre-extracted passage index.
 * Each passage has keywords; we score how well each passage matches each rubric.
 */
function matchPassagesFromIndex(
  passages: Array<{ keywords: string[]; passage: string }>,
  rubrics: string[]
): Record<string, string> {
  const results: Record<string, string> = {};

  for (const sym of rubrics) {
    // Extract search terms from the rubric path
    const parts = sym.split(",").map(s => s.trim().toLowerCase());
    const searchTerms = parts
      .filter(p => p.length > 2)
      .flatMap(p => p.replace(/[()]/g, "").split(/\s+/))
      .filter(w => w.length > 3 && !["with", "from", "morbid", "desire"].includes(w));

    if (searchTerms.length === 0) continue;

    // Score each passage against this rubric
    let bestPassage = "";
    let bestScore = 0;

    for (const p of passages) {
      if (!p.keywords || !p.passage) continue;
      const kwStr = p.keywords.join(" ").toLowerCase();
      const passageLower = p.passage.toLowerCase();

      let score = 0;
      for (const term of searchTerms) {
        if (kwStr.includes(term)) score += 2; // keyword match worth more
        if (passageLower.includes(term)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPassage = p.passage;
      }
    }

    if (bestScore >= 2 && bestPassage) {
      results[sym] = bestPassage;
    }
  }

  return results;
}

function buildRemedyUrl(
  file: string,
  rubrics: string[],
  highlight?: string
): string {
  const slug = file.replace(/\.md$/, "");
  const params = new URLSearchParams();
  if (rubrics.length > 0) {
    params.set("rubrics", rubrics.join("|"));
  }
  if (highlight) {
    params.set("highlight", highlight);
  }
  const qs = params.toString();
  return navUrl(`/remedy/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`);
}

export function MateriaPanel({
  remedyAbbrev,
  selectedRubrics,
  grades,
  onPassageClick,
  selectedPassage,
}: {
  remedyAbbrev: string;
  selectedRubrics: string[];
  grades?: Record<string, number>;
  onPassageClick?: (passage: string) => void;
  selectedPassage?: string;
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

    loadMateriaData().then(async ({ profiles, rubricIndex, archiveLinks }) => {
      if (cancelled) return;
      if (!profiles || !profiles[remedyAbbrev]) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const prof = profiles[remedyAbbrev];
      setProfile(prof);

      // Match rubrics against the pre-extracted passage index
      const remedyPassages = cachedPassageIndex?.[remedyAbbrev] ?? [];
      const matched = matchPassagesFromIndex(remedyPassages, selectedRubrics);

      // Also check the old pre-computed rubric index as fallback
      const preComputed = rubricIndex?.[remedyAbbrev] ?? {};

      // Merge: passage index first, then old pre-computed
      const merged: Record<string, string> = {};
      for (const sym of selectedRubrics) {
        if (matched[sym]) {
          merged[sym] = matched[sym];
        } else if (preComputed[sym]) {
          merged[sym] = preComputed[sym];
        } else {
          merged[sym] = "";
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
      <div className="py-6 text-center text-sm text-[var(--fg-2)]">
        Loading materia medica...
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="px-6 py-16 text-center text-[var(--fg-2)]">
        <p className="mb-1 text-sm font-medium">No Materia Medica available</p>
        <p className="text-xs">
          Kent&apos;s Materia Medica does not include data for this remedy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Rubric Cross-References */}
      {selectedRubrics.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--fg-accent)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Rubric Cross-References
          </h3>
          <div className="space-y-3">
            {selectedRubrics.map((sym) => {
              const passage = passages?.[sym];
              const grade = grades?.[sym];
              const isSelected = passage && selectedPassage === passage;
              return (
                <div
                  key={sym}
                  onClick={() => passage && onPassageClick?.(passage)}
                  className={`rounded-[8px] border p-3 transition-colors ${
                    passage ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "border-[var(--border-accent)] bg-[var(--teal-soft)]"
                      : "border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--sage-soft)]"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {grade && (
                      <span className={`grade grade-${grade} inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold`}>
                        {grade}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[var(--fg-1)]">
                      {sym}
                    </span>
                  </div>
                  {passage ? (
                    <div
                      className="hm-serif my-1 text-[14px] text-[var(--fg-1)] leading-[1.7]"
                    >
                      &ldquo;{passage}&rdquo;
                    </div>
                  ) : (
                    <p className="text-[13px] italic text-[var(--ink-50)]">
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--fg-accent)]">
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--fg-accent)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Full Book Text
        </h3>
        <div className="flex flex-wrap gap-3">
          <a
            href={buildRemedyUrl(profile.file, selectedRubrics)}
            target="_blank"
            rel="noopener noreferrer"
            className="hm-action-button hm-action-button--primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium no-underline"
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
              className="hm-action-button hm-action-button--secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium no-underline"
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
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-sunken)] p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--fg-2)]">
        {label}
      </div>
      <p className="m-0 text-[13px] leading-relaxed text-[var(--fg-1)]">{text}</p>
    </div>
  );
}
