"""
Tests for data compression / splitting pipeline.
These tests verify the splitting scripts produce correct output.
Run AFTER executing the splitting scripts.
"""

import json
import os
import glob
import subprocess
import pytest

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SYMPTOMS_ORIGINAL = os.path.join(DATA_DIR, "symptoms.json")
REMEDIES_ORIGINAL = os.path.join(DATA_DIR, "remedies.json")
KENT_DIR = os.path.join(DATA_DIR, "kent", "materia_medica")
WEB_FONTS_DIR = os.path.join(os.path.dirname(__file__), "web", "app", "fonts")
WEB_CSS = os.path.join(os.path.dirname(__file__), "web", "app", "globals.css")

EXPECTED_RUBRIC_COUNT = 74_481
EXPECTED_REMEDY_COUNT = 2_432
EXPECTED_BODY_SYSTEMS = 41


# ============================================================
# Helpers
# ============================================================

def load_json(path):
    with open(path, "r") as f:
        return json.load(f)


def load_original_rubrics():
    return load_json(SYMPTOMS_ORIGINAL)


def load_original_remedies():
    return load_json(REMEDIES_ORIGINAL)


# ============================================================
# A1. Rubric Splitting
# ============================================================

class TestRubricSplitting:
    """Tests that symptoms.json is correctly split into body-system directories."""

    SPLIT_DIR = os.path.join(DATA_DIR, "rubrics")

    def test_splitting_script_exists(self):
        """A splitting script exists and is executable."""
        candidates = [
            os.path.join(os.path.dirname(__file__), "scripts", "split_rubrics.py"),
            os.path.join(os.path.dirname(__file__), "scraper", "split_rubrics.py"),
            os.path.join(os.path.dirname(__file__), "split_rubrics.py"),
        ]
        found = [c for c in candidates if os.path.isfile(c)]
        assert len(found) > 0, (
            f"No splitting script found. Looked in: {candidates}"
        )

    def test_splitting_script_runs_without_error(self):
        """The splitting script runs without raising an error."""
        candidates = [
            os.path.join(os.path.dirname(__file__), "scripts", "split_rubrics.py"),
            os.path.join(os.path.dirname(__file__), "scraper", "split_rubrics.py"),
            os.path.join(os.path.dirname(__file__), "split_rubrics.py"),
        ]
        script = next((c for c in candidates if os.path.isfile(c)), None)
        assert script is not None, "No splitting script found"
        result = subprocess.run(
            ["python3", script],
            capture_output=True,
            text=True,
            timeout=120,
        )
        assert result.returncode == 0, (
            f"Script failed with code {result.returncode}: {result.stderr}"
        )

    def test_split_directory_exists(self):
        """data/rubrics/ directory exists after splitting."""
        assert os.path.isdir(self.SPLIT_DIR), (
            f"Expected directory {self.SPLIT_DIR} to exist"
        )

    def test_41_body_system_directories(self):
        """Exactly 41 body system directories are created."""
        if not os.path.isdir(self.SPLIT_DIR):
            pytest.skip("Split directory does not exist yet")
        dirs = [
            d for d in os.listdir(self.SPLIT_DIR)
            if os.path.isdir(os.path.join(self.SPLIT_DIR, d))
        ]
        assert len(dirs) == EXPECTED_BODY_SYSTEMS, (
            f"Expected {EXPECTED_BODY_SYSTEMS} body system dirs, got {len(dirs)}: {sorted(dirs)}"
        )

    def test_subcategory_files_are_valid_json(self):
        """All .json files in body system directories are valid JSON."""
        if not os.path.isdir(self.SPLIT_DIR):
            pytest.skip("Split directory does not exist yet")
        json_files = glob.glob(os.path.join(self.SPLIT_DIR, "**", "*.json"), recursive=True)
        # Exclude index.json at the top level
        json_files = [f for f in json_files if os.path.basename(f) != "index.json" or os.path.dirname(f) != self.SPLIT_DIR]
        assert len(json_files) > 0, "No JSON files found in split directories"
        for path in json_files:
            try:
                load_json(path)
            except (json.JSONDecodeError, Exception) as e:
                pytest.fail(f"Invalid JSON in {path}: {e}")

    def test_every_rubric_appears_exactly_once(self):
        """Every rubric from the original file appears in exactly one split file."""
        if not os.path.isdir(self.SPLIT_DIR):
            pytest.skip("Split directory does not exist yet")
        original = load_original_rubrics()
        original_names = set(original.keys())

        split_names = set()
        duplicates = []
        json_files = glob.glob(os.path.join(self.SPLIT_DIR, "**", "*.json"), recursive=True)
        # Exclude index.json
        json_files = [f for f in json_files if os.path.basename(f) != "index.json"]

        for path in json_files:
            data = load_json(path)
            for name in data.keys():
                if name in split_names:
                    duplicates.append(name)
                split_names.add(name)

        assert len(duplicates) == 0, (
            f"Found {len(duplicates)} duplicate rubrics: {duplicates[:5]}..."
        )
        missing = original_names - split_names
        extra = split_names - original_names
        assert missing == set(), f"Missing rubrics: {list(missing)[:5]}..."
        assert extra == set(), f"Extra rubrics: {list(extra)[:5]}..."

    def test_total_count_equals_74481(self):
        """Total rubric count across all split files equals 74,481."""
        if not os.path.isdir(self.SPLIT_DIR):
            pytest.skip("Split directory does not exist yet")
        total = 0
        json_files = glob.glob(os.path.join(self.SPLIT_DIR, "**", "*.json"), recursive=True)
        json_files = [f for f in json_files if os.path.basename(f) != "index.json"]
        for path in json_files:
            data = load_json(path)
            total += len(data)
        assert total == EXPECTED_RUBRIC_COUNT, (
            f"Expected {EXPECTED_RUBRIC_COUNT} rubrics, got {total}"
        )

    def test_remedy_references_and_grades_preserved(self):
        """All remedy references and grades are preserved exactly in split files."""
        if not os.path.isdir(self.SPLIT_DIR):
            pytest.skip("Split directory does not exist yet")
        original = load_original_rubrics()

        # Build lookup from split files
        split_data = {}
        json_files = glob.glob(os.path.join(self.SPLIT_DIR, "**", "*.json"), recursive=True)
        json_files = [f for f in json_files if os.path.basename(f) != "index.json"]
        for path in json_files:
            data = load_json(path)
            split_data.update(data)

        # Spot check a sample of rubrics
        sample_keys = list(original.keys())[:100] + list(original.keys())[-100:]
        for key in sample_keys:
            assert key in split_data, f"Rubric '{key}' missing from split data"
            orig_remedies = original[key]["remedies"]
            split_remedies = split_data[key]["remedies"]
            assert orig_remedies == split_remedies, (
                f"Remedies mismatch for '{key}': original has {len(orig_remedies)} remedies, "
                f"split has {len(split_remedies)}"
            )


# ============================================================
# A2. Rubric Index
# ============================================================

class TestRubricIndex:
    """Tests for the lightweight rubric index file."""

    INDEX_PATH = os.path.join(DATA_DIR, "rubrics", "index.json")

    def test_index_exists(self):
        """data/rubrics/index.json exists."""
        assert os.path.isfile(self.INDEX_PATH), (
            f"Expected {self.INDEX_PATH} to exist"
        )

    def test_index_is_valid_json(self):
        """index.json is valid JSON."""
        if not os.path.isfile(self.INDEX_PATH):
            pytest.skip("Index file does not exist yet")
        load_json(self.INDEX_PATH)

    def test_index_contains_all_rubric_names(self):
        """Index contains all 74,481 rubric names."""
        if not os.path.isfile(self.INDEX_PATH):
            pytest.skip("Index file does not exist yet")
        index = load_json(self.INDEX_PATH)
        if isinstance(index, list):
            names = index
        elif isinstance(index, dict):
            names = list(index.keys())
        else:
            pytest.fail(f"Unexpected index type: {type(index)}")
        assert len(names) == EXPECTED_RUBRIC_COUNT, (
            f"Expected {EXPECTED_RUBRIC_COUNT} entries, got {len(names)}"
        )

    def test_index_contains_no_remedy_data(self):
        """Index is lightweight — no remedy data included."""
        if not os.path.isfile(self.INDEX_PATH):
            pytest.skip("Index file does not exist yet")
        raw = open(self.INDEX_PATH).read()
        # Should not contain grade numbers associated with remedy abbreviations
        # If it's a list of strings, it can't have remedy data
        index = json.loads(raw)
        if isinstance(index, list):
            # Good — just names
            for item in index[:100]:
                assert isinstance(item, str), f"Expected string, got {type(item)}: {item}"
        elif isinstance(index, dict):
            # Values should be lightweight (e.g., body system, path) not full remedy dicts
            for key in list(index.keys())[:100]:
                val = index[key]
                assert not isinstance(val, dict) or "remedies" not in val, (
                    f"Index entry '{key}' contains remedy data — should be lightweight"
                )

    def test_index_file_under_2mb(self):
        """Index file is under 2 MB (lightweight for initial load)."""
        if not os.path.isfile(self.INDEX_PATH):
            pytest.skip("Index file does not exist yet")
        size = os.path.getsize(self.INDEX_PATH)
        max_size = 2 * 1024 * 1024  # 2 MB
        assert size < max_size, (
            f"Index file is {size / 1024 / 1024:.1f} MB, expected under 2 MB"
        )


# ============================================================
# A3. Remedy Splitting
# ============================================================

class TestRemedySplitting:
    """Tests for splitting remedies into individual files."""

    REMEDIES_DIR = os.path.join(DATA_DIR, "remedies")
    INDEX_PATH = os.path.join(DATA_DIR, "remedies", "index.json")

    def test_remedy_index_exists(self):
        """data/remedies/index.json exists."""
        assert os.path.isfile(self.INDEX_PATH), (
            f"Expected {self.INDEX_PATH} to exist"
        )

    def test_remedy_index_has_abbreviation_lookup(self):
        """Index contains abbreviation -> full name lookup."""
        if not os.path.isfile(self.INDEX_PATH):
            pytest.skip("Index file does not exist yet")
        index = load_json(self.INDEX_PATH)
        assert isinstance(index, dict), "Index should be a dict"
        # Check a known remedy
        assert "Acon." in index, "Expected 'Acon.' in remedy index"
        assert index["Acon."] == "Aconitum Napellus" or isinstance(index["Acon."], dict), (
            f"Unexpected value for Acon.: {index['Acon.']}"
        )

    def test_individual_remedy_files_exist(self):
        """Individual remedy files in data/remedies/{first_letter}/{abbrev}.json."""
        if not os.path.isdir(self.REMEDIES_DIR):
            pytest.skip("Remedies directory does not exist yet")
        json_files = glob.glob(
            os.path.join(self.REMEDIES_DIR, "**", "*.json"), recursive=True
        )
        # Exclude index.json
        remedy_files = [f for f in json_files if os.path.basename(f) != "index.json"]
        assert len(remedy_files) > 0, "No individual remedy files found"

    def test_remedy_files_organized_by_first_letter(self):
        """Remedy files are in subdirectories named by first letter."""
        if not os.path.isdir(self.REMEDIES_DIR):
            pytest.skip("Remedies directory does not exist yet")
        letter_dirs = [
            d for d in os.listdir(self.REMEDIES_DIR)
            if os.path.isdir(os.path.join(self.REMEDIES_DIR, d))
        ]
        assert len(letter_dirs) > 0, "No letter subdirectories found"
        for d in letter_dirs:
            assert len(d) == 1 and d.isalpha(), (
                f"Expected single-letter directory name, got '{d}'"
            )

    def test_all_2432_remedies_accounted_for(self):
        """All 2,432 remedies have corresponding files."""
        if not os.path.isdir(self.REMEDIES_DIR):
            pytest.skip("Remedies directory does not exist yet")
        json_files = glob.glob(
            os.path.join(self.REMEDIES_DIR, "**", "*.json"), recursive=True
        )
        remedy_files = [f for f in json_files if os.path.basename(f) != "index.json"]
        assert len(remedy_files) == EXPECTED_REMEDY_COUNT, (
            f"Expected {EXPECTED_REMEDY_COUNT} remedy files, got {len(remedy_files)}"
        )

    def test_remedy_files_are_valid_json(self):
        """All individual remedy files are valid JSON."""
        if not os.path.isdir(self.REMEDIES_DIR):
            pytest.skip("Remedies directory does not exist yet")
        json_files = glob.glob(
            os.path.join(self.REMEDIES_DIR, "**", "*.json"), recursive=True
        )
        remedy_files = [f for f in json_files if os.path.basename(f) != "index.json"]
        for path in remedy_files[:50]:  # Sample check
            try:
                load_json(path)
            except Exception as e:
                pytest.fail(f"Invalid JSON in {path}: {e}")


# ============================================================
# A4. Kent Data Splitting
# ============================================================

class TestKentDataSplitting:
    """Tests for splitting Kent materia medica data per remedy."""

    KENT_SPLIT_DIR = os.path.join(KENT_DIR, "split")

    def test_passage_index_split_per_remedy(self):
        """passage_index is split into individual remedy files."""
        passage_dir = os.path.join(self.KENT_SPLIT_DIR, "passage_index")
        assert os.path.isdir(passage_dir), (
            f"Expected {passage_dir} to exist"
        )
        files = glob.glob(os.path.join(passage_dir, "*.json"))
        assert len(files) > 0, "No split passage_index files found"

    def test_profiles_split_per_remedy(self):
        """profiles are split into individual remedy files."""
        profiles_dir = os.path.join(self.KENT_SPLIT_DIR, "profiles")
        assert os.path.isdir(profiles_dir), (
            f"Expected {profiles_dir} to exist"
        )
        files = glob.glob(os.path.join(profiles_dir, "*.json"))
        assert len(files) > 0, "No split profile files found"

    def test_rubric_index_split_per_remedy(self):
        """rubric_index is split into individual remedy files."""
        si_dir = os.path.join(self.KENT_SPLIT_DIR, "rubric_index")
        assert os.path.isdir(si_dir), (
            f"Expected {si_dir} to exist"
        )
        files = glob.glob(os.path.join(si_dir, "*.json"))
        assert len(files) > 0, "No split rubric_index files found"

    def test_passage_index_data_preserved(self):
        """All passage_index data is preserved after splitting."""
        passage_dir = os.path.join(self.KENT_SPLIT_DIR, "passage_index")
        if not os.path.isdir(passage_dir):
            pytest.skip("Split passage_index directory does not exist yet")

        original = load_json(os.path.join(KENT_DIR, "passage_index.json"))
        split_data = {}
        for f in glob.glob(os.path.join(passage_dir, "*.json")):
            data = load_json(f)
            split_data.update(data)

        assert set(original.keys()) == set(split_data.keys()), (
            "Remedy keys mismatch between original and split passage_index"
        )
        for key in original:
            assert len(original[key]) == len(split_data[key]), (
                f"Passage count mismatch for {key}"
            )

    def test_profiles_data_preserved(self):
        """All profiles data is preserved after splitting."""
        profiles_dir = os.path.join(self.KENT_SPLIT_DIR, "profiles")
        if not os.path.isdir(profiles_dir):
            pytest.skip("Split profiles directory does not exist yet")

        original = load_json(os.path.join(KENT_DIR, "profiles.json"))
        split_data = {}
        for f in glob.glob(os.path.join(profiles_dir, "*.json")):
            data = load_json(f)
            split_data.update(data)

        assert set(original.keys()) == set(split_data.keys()), (
            "Remedy keys mismatch between original and split profiles"
        )

    def test_rubric_index_data_preserved(self):
        """All rubric_index data is preserved after splitting."""
        si_dir = os.path.join(self.KENT_SPLIT_DIR, "rubric_index")
        if not os.path.isdir(si_dir):
            pytest.skip("Split rubric_index directory does not exist yet")

        original = load_json(os.path.join(KENT_DIR, "rubric_index.json"))
        split_data = {}
        for f in glob.glob(os.path.join(si_dir, "*.json")):
            data = load_json(f)
            split_data.update(data)

        assert set(original.keys()) == set(split_data.keys()), (
            "Remedy keys mismatch between original and split rubric_index"
        )


# ============================================================
# A5. Font Conversion
# ============================================================

class TestFontConversion:
    """Tests for WOFF2 font conversion and cleanup."""

    def test_woff2_carlito_regular_exists(self):
        """WOFF2 version of Carlito-Regular exists."""
        path = os.path.join(WEB_FONTS_DIR, "Carlito", "Carlito-Regular.woff2")
        assert os.path.isfile(path), f"Expected {path} to exist"

    def test_woff2_carlito_bold_exists(self):
        """WOFF2 version of Carlito-Bold exists."""
        path = os.path.join(WEB_FONTS_DIR, "Carlito", "Carlito-Bold.woff2")
        assert os.path.isfile(path), f"Expected {path} to exist"

    def test_woff2_carlito_italic_exists(self):
        """WOFF2 version of Carlito-Italic exists."""
        path = os.path.join(WEB_FONTS_DIR, "Carlito", "Carlito-Italic.woff2")
        assert os.path.isfile(path), f"Expected {path} to exist"

    def test_woff2_carlito_bolditalic_exists(self):
        """WOFF2 version of Carlito-BoldItalic exists."""
        path = os.path.join(WEB_FONTS_DIR, "Carlito", "Carlito-BoldItalic.woff2")
        assert os.path.isfile(path), f"Expected {path} to exist"

    def test_woff2_smaller_than_ttf(self):
        """WOFF2 files are smaller than corresponding TTF files."""
        carlito_dir = os.path.join(WEB_FONTS_DIR, "Carlito")
        for name in ["Carlito-Regular", "Carlito-Bold", "Carlito-Italic", "Carlito-BoldItalic"]:
            ttf = os.path.join(carlito_dir, f"{name}.ttf")
            woff2 = os.path.join(carlito_dir, f"{name}.woff2")
            if not os.path.isfile(woff2):
                pytest.skip(f"WOFF2 file {woff2} does not exist yet")
            if not os.path.isfile(ttf):
                # TTF may have been removed after conversion — that's fine
                continue
            ttf_size = os.path.getsize(ttf)
            woff2_size = os.path.getsize(woff2)
            assert woff2_size < ttf_size, (
                f"{name}.woff2 ({woff2_size}) should be smaller than .ttf ({ttf_size})"
            )

    def test_hostgrotesk_fonts_removed(self):
        """HostGrotesk font files are removed."""
        hg_files = glob.glob(os.path.join(WEB_FONTS_DIR, "HostGrotesk*"))
        assert len(hg_files) == 0, (
            f"HostGrotesk fonts should be removed, found: {hg_files}"
        )

    def test_css_references_woff2(self):
        """CSS @font-face declarations reference .woff2 format."""
        assert os.path.isfile(WEB_CSS), f"Expected {WEB_CSS} to exist"
        css = open(WEB_CSS).read()
        # Should have woff2 references
        assert ".woff2" in css, "CSS should reference .woff2 font files"
        # Should NOT have .ttf references in @font-face
        import re
        ttf_refs = re.findall(r"@font-face\s*\{[^}]*\.ttf[^}]*\}", css, re.DOTALL)
        assert len(ttf_refs) == 0, (
            f"Found {len(ttf_refs)} @font-face blocks still referencing .ttf"
        )
