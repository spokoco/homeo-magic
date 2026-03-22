#!/usr/bin/env python3
"""
Tests for profile data integrity - ensures abbreviation keys in profiles.json
map to the correct remedy names per the canonical remedies data.
Run with: python3 -m pytest test-profile-integrity.py -v
"""

import json
import re
import pytest
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
PROFILES_PATH = DATA_DIR / "kent" / "materia_medica" / "profiles.json"
REMEDIES_INDEX_PATH = DATA_DIR / "remedies" / "index.json"
MARKDOWN_DIR = DATA_DIR / "kent" / "materia_medica" / "remedy_markdown"


@pytest.fixture(scope="module")
def profiles():
    return json.loads(PROFILES_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def remedies_index():
    return json.loads(REMEDIES_INDEX_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def name_to_abbrev(remedies_index):
    """Reverse mapping: remedy name -> abbreviation."""
    return {name: abbr for abbr, name in remedies_index.items()}


def get_md_heading(filepath: Path) -> str | None:
    """Extract the first H1 heading from a markdown file."""
    text = filepath.read_text(encoding="utf-8")
    match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    return match.group(1).strip() if match else None


class TestProfileKeyIntegrity:
    """Each profile key (abbreviation) must map to the correct remedy."""

    def test_sulph_maps_to_sulphur(self, profiles, remedies_index):
        """Sulph. should map to Sulphur, not Natrum Sulphuricum."""
        entry = profiles["Sulph."]
        assert entry["remedy"] == "Sulphur", (
            f"Sulph. maps to '{entry['remedy']}' but should be 'Sulphur'"
        )
        assert remedies_index["Sulph."] == "Sulphur"

    def test_ars_s_f_not_in_profiles(self, profiles):
        """Ars-s-f. was a wrong key for Sulphur data — it should no longer exist."""
        assert "Ars-s-f." not in profiles, (
            "Ars-s-f. should not be a key in profiles (was incorrectly mapped to Sulphur)"
        )

    def test_all_abbreviation_keys_match_remedies(self, profiles, remedies_index):
        """Every abbreviated key must have remedy name matching the remedies index."""
        mismatches = []
        for abbr, entry in profiles.items():
            expected = remedies_index.get(abbr)
            if expected and expected != entry["remedy"]:
                mismatches.append(
                    f"  {abbr}: got '{entry['remedy']}', expected '{expected}'"
                )
        assert not mismatches, (
            f"{len(mismatches)} abbreviation(s) map to wrong remedy:\n"
            + "\n".join(mismatches)
        )

    def test_file_field_exists(self, profiles):
        """The 'file' field should point to an existing markdown file."""
        missing = []
        for abbr, entry in profiles.items():
            md_path = MARKDOWN_DIR / entry["file"]
            if not md_path.exists():
                missing.append(f"  {abbr}: file '{entry['file']}' does not exist")
        assert not missing, (
            f"{len(missing)} file(s) missing:\n" + "\n".join(missing)
        )


class TestMarkdownHeadingConsistency:
    """The markdown file referenced should contain content about the correct remedy."""

    def test_markdown_heading_matches_remedy(self, profiles, remedies_index):
        """First heading in .md file should be related to the remedy for that key.

        Kent's text uses short names (e.g. 'Aloe') while the canonical index uses
        full names ('Aloe Socotrina'), so we check that the canonical name starts
        with the heading or they share the same first word.
        """
        mismatches = []
        for abbr, entry in profiles.items():
            expected_name = remedies_index.get(abbr)
            if not expected_name:
                continue
            md_path = MARKDOWN_DIR / entry["file"]
            if not md_path.exists():
                continue
            heading = get_md_heading(md_path)
            if not heading:
                continue
            # Accept: exact match, canonical starts with heading, same first word,
            # or close spelling (first 4 chars of each word match — handles
            # Kent's historical spellings like Natrum/Natrium, Magnesia/Magnesium)
            h_lower = heading.lower()
            e_lower = expected_name.lower()
            h_words = h_lower.split()
            e_words = e_lower.split()
            close_spelling = (
                len(h_words) >= 1 and len(e_words) >= 1
                and h_words[0][:4] == e_words[0][:4]
                and (len(h_words) < 2 or len(e_words) < 2
                     or h_words[1][:4] == e_words[1][:4])
            )
            if (h_lower == e_lower
                    or e_lower.startswith(h_lower)
                    or h_lower.split()[0] == e_lower.split()[0]
                    or close_spelling):
                continue
            mismatches.append(
                f"  {abbr}: heading is '{heading}', expected '{expected_name}'"
            )
        assert not mismatches, (
            f"{len(mismatches)} markdown heading(s) don't match abbreviation's remedy:\n"
            + "\n".join(mismatches)
        )

    def test_sulph_markdown_is_about_sulphur(self, profiles):
        """The file for Sulph. should contain a heading about Sulphur."""
        entry = profiles["Sulph."]
        md_path = MARKDOWN_DIR / entry["file"]
        heading = get_md_heading(md_path)
        assert heading == "Sulphur", (
            f"Sulph. points to file with heading '{heading}', expected 'Sulphur'"
        )
