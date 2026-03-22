#!/usr/bin/env python3
"""
Fix profiles.json abbreviation key mappings.

The profile data (personality, mental_state, emotional_pattern) is correct per
markdown file, but entries have two types of errors:
1. Wrong abbreviation key (e.g. Sulph. -> natrum_sulphuricum.md)
2. Short remedy name instead of canonical full name (e.g. "Aloe" vs "Aloe Socotrina")

This script:
1. Reads each profile entry's 'file' field (e.g. 'natrum_sulphuricum.md')
2. Reads the markdown file to get the remedy name from the H1 heading
3. Finds the correct abbreviation for that remedy from the remedies index
4. Updates the remedy name to the canonical full name from the index
5. Rebuilds profiles.json with correct keys and names
"""

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
PROFILES_PATH = DATA_DIR / "kent" / "materia_medica" / "profiles.json"
REMEDIES_INDEX_PATH = DATA_DIR / "remedies" / "index.json"
MARKDOWN_DIR = DATA_DIR / "kent" / "materia_medica" / "remedy_markdown"
PUBLIC_PROFILES_PATH = ROOT / "web" / "public" / "data" / "kent" / "profiles.json"


def get_md_heading(filepath: Path) -> str | None:
    """Extract the first H1 heading from a markdown file."""
    text = filepath.read_text(encoding="utf-8")
    match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else None


def find_abbreviation(heading: str, name_to_abbrev: dict) -> tuple[str, str] | None:
    """Find the correct abbreviation and canonical name for a markdown heading.

    Tries exact match first, then partial match, then close-spelling match.
    Returns (abbreviation, canonical_name) or None.
    """
    # Exact match
    if heading in name_to_abbrev:
        return name_to_abbrev[heading], heading

    # Partial match: heading is a prefix of the full canonical name
    for full_name, abbr in name_to_abbrev.items():
        if full_name.lower().startswith(heading.lower()) and full_name != heading:
            return abbr, full_name

    # Close match: first word shares a long prefix and second word shares a prefix
    # Handles variants like "Natrum Sulphuricum" vs "Natrium Sulphuricum"
    # and "Apis Mellifica" vs "Apis Mellifera"
    heading_parts = heading.lower().split()
    if len(heading_parts) >= 2:
        for full_name, abbr in name_to_abbrev.items():
            name_parts = full_name.lower().split()
            if len(name_parts) >= 2:
                # First words share at least 4 chars, second words share at least 5 chars
                w1h, w1n = heading_parts[0], name_parts[0]
                w2h, w2n = heading_parts[1], name_parts[1]
                if (w1h[:4] == w1n[:4] and w2h[:5] == w2n[:5]):
                    return abbr, full_name

    return None


def main():
    profiles = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
    remedies_index = json.loads(REMEDIES_INDEX_PATH.read_text(encoding="utf-8"))

    # Reverse: remedy name -> abbreviation
    name_to_abbrev = {name: abbr for abbr, name in remedies_index.items()}

    # First pass: determine the correct abbreviation for each entry
    entries = []  # list of (correct_abbr, entry, old_key, canonical_name)
    for old_key, entry in profiles.items():
        md_path = MARKDOWN_DIR / entry["file"]
        if not md_path.exists():
            entries.append((old_key, entry, old_key, entry["remedy"]))
            continue

        heading = get_md_heading(md_path)
        if not heading:
            entries.append((old_key, entry, old_key, entry["remedy"]))
            continue

        result = find_abbreviation(heading, name_to_abbrev)
        if not result:
            entries.append((old_key, entry, old_key, entry["remedy"]))
            continue

        correct_abbr, canonical_name = result
        # Update entry fields — keep the file pointing to the actual markdown file
        entry["remedy"] = canonical_name
        entry["abbreviations"] = [correct_abbr]
        entry["file"] = heading.lower().replace(" ", "_") + ".md"
        entries.append((correct_abbr, entry, old_key, canonical_name))

    # Second pass: build the fixed dict, detecting and reporting collisions
    fixed = {}
    key_fixes = 0
    name_fixes = 0

    for correct_abbr, entry, old_key, canonical_name in entries:
        if correct_abbr in fixed and correct_abbr != old_key:
            # Collision: this entry wants the same key as an already-placed entry
            # The entry already in `fixed` was placed by its own old_key matching,
            # so it's the one that needs to be re-keyed (it had the wrong key originally)
            evicted = fixed[correct_abbr]
            evicted_heading = get_md_heading(MARKDOWN_DIR / evicted["file"]) if (MARKDOWN_DIR / evicted["file"]).exists() else None
            if evicted_heading:
                evicted_result = find_abbreviation(evicted_heading, name_to_abbrev)
                if evicted_result and evicted_result[0] != correct_abbr:
                    evicted_correct, evicted_canonical = evicted_result
                    evicted["remedy"] = evicted_canonical
                    evicted["abbreviations"] = [evicted_correct]
                    evicted["file"] = evicted_heading.lower().replace(" ", "_") + ".md"
                    fixed[evicted_correct] = evicted
                    key_fixes += 1
                    print(f"  KEY FIX (collision): {correct_abbr} -> {evicted_correct} ({evicted_canonical})")

        if correct_abbr != old_key:
            key_fixes += 1
            print(f"  KEY FIX: {old_key} -> {correct_abbr} ({canonical_name})")
        elif entry.get("remedy") != canonical_name:
            name_fixes += 1
            print(f"  NAME FIX: {correct_abbr}: -> '{canonical_name}'")

        fixed[correct_abbr] = entry

    # Write fixed profiles
    PROFILES_PATH.write_text(
        json.dumps(fixed, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\nFixed {key_fixes} key mappings and {name_fixes} remedy names in {PROFILES_PATH}")
    print(f"Total entries: {len(fixed)}")

    # Update public copy
    if PUBLIC_PROFILES_PATH.exists():
        shutil.copy2(PROFILES_PATH, PUBLIC_PROFILES_PATH)
        print(f"Copied to {PUBLIC_PROFILES_PATH}")
    else:
        print(f"Public copy not found at {PUBLIC_PROFILES_PATH}")


if __name__ == "__main__":
    main()
