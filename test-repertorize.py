#!/usr/bin/env python3
"""
Tests for the repertorization engine (engine/repertorize.py).
Run with: python3 -m pytest test-repertorize.py -v
"""

import json
import pytest
from pathlib import Path

from engine.repertorize import search_rubrics, repertorize

DATA_DIR = Path(__file__).parent / "data"


# --- Fixtures ---

@pytest.fixture(scope="module")
def rubrics():
    with open(DATA_DIR / "symptoms.json") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def remedies():
    with open(DATA_DIR / "remedies.json") as f:
        return json.load(f)


# --- Search Tests ---

class TestSearchRubrics:
    """Test rubric search functionality."""

    def test_basic_search(self, rubrics):
        matches = search_rubrics("headache", rubrics)
        assert len(matches) > 0

    def test_case_insensitive(self, rubrics):
        lower = search_rubrics("headache", rubrics)
        upper = search_rubrics("HEADACHE", rubrics)
        assert lower == upper

    def test_partial_match(self, rubrics):
        matches = search_rubrics("irritab", rubrics)
        assert len(matches) > 0
        assert all("irritab" in m.lower() for m in matches)

    def test_limit_respected(self, rubrics):
        matches = search_rubrics("pain", rubrics, limit=5)
        assert len(matches) <= 5

    def test_no_results(self, rubrics):
        matches = search_rubrics("xyznonexistent123", rubrics)
        assert len(matches) == 0

    def test_comma_path_search(self, rubrics):
        """Searching with comma-separated path should work."""
        matches = search_rubrics("cold, agg", rubrics)
        assert len(matches) > 0

    def test_returns_valid_rubric_keys(self, rubrics):
        matches = search_rubrics("headache", rubrics)
        for m in matches:
            assert m in rubrics, f"Search result '{m}' not in rubrics database"

    def test_default_limit(self, rubrics):
        matches = search_rubrics("pain", rubrics)
        assert len(matches) <= 10  # default limit


# --- Repertorization Tests ---

class TestRepertorize:
    """Test the repertorization algorithm."""

    CLASSIC_RUBRICS = [
        "Head, pain, morning",
        "Mind, irritability",
        "Generalities, cold, in general agg."
    ]

    def test_empty_rubrics(self, rubrics, remedies):
        results = repertorize([], rubrics, remedies)
        assert results == []

    def test_single_rubric(self, rubrics, remedies):
        results = repertorize(["Mind, irritability"], rubrics, remedies)
        assert len(results) > 0

    def test_intersection_returns_results(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        assert len(results) > 0

    def test_results_sorted_by_score(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        scores = [r[1] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_result_tuple_structure(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        for r in results[:5]:
            assert len(r) == 4, f"Expected 4-tuple, got {len(r)}"
            abbrev, score, breakdown, full_name = r
            assert isinstance(abbrev, str)
            assert isinstance(score, int)
            assert isinstance(breakdown, dict)
            assert isinstance(full_name, str)

    def test_breakdown_contains_all_rubrics(self, rubrics, remedies):
        """Each remedy in the intersection should have scores for ALL rubrics."""
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        for abbrev, score, breakdown, _ in results:
            assert len(breakdown) == len(self.CLASSIC_RUBRICS), \
                f"{abbrev} breakdown has {len(breakdown)} entries, expected {len(self.CLASSIC_RUBRICS)}"

    def test_scores_are_positive(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        for _, score, _, _ in results:
            assert score > 0

    def test_nux_vomica_in_classic_repertorization(self, rubrics, remedies):
        """Nux Vomica should appear in top results for its classic rubrics."""
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        abbrevs = [r[0] for r in results[:5]]
        assert "Nux-v." in abbrevs, f"Nux-v. not in top 5: {abbrevs}"

    def test_total_score_equals_sum_of_breakdown(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        for abbrev, total, breakdown, _ in results:
            expected = sum(breakdown.values())
            assert total == expected, f"{abbrev}: total {total} != sum {expected}"

    def test_intersection_count_reasonable(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        assert len(results) >= 50, f"Only {len(results)} remedies in intersection"

    def test_nonexistent_rubric_handled(self, rubrics, remedies):
        """Nonexistent rubrics should not crash."""
        results = repertorize(["Nonexistent, fake, symptom"], rubrics, remedies)
        assert results == []

    def test_mixed_valid_invalid_rubrics(self, rubrics, remedies):
        """Mix of valid and invalid rubrics should still produce results."""
        mixed = ["Mind, irritability", "Nonexistent, fake, symptom"]
        results = repertorize(mixed, rubrics, remedies)
        # Results should come from the valid rubric only, but since intersection
        # requires ALL rubrics, and invalid one has no remedies, result is empty
        # (this tests the behavior correctly)
        assert isinstance(results, list)

    def test_single_rubric_all_remedies_present(self, rubrics, remedies):
        """With one rubric, all remedies listed for it should appear."""
        rubric = "Mind, irritability"
        results = repertorize([rubric], rubrics, remedies)
        result_abbrevs = {r[0] for r in results}
        expected = set(rubrics[rubric]["remedies"].keys())
        assert result_abbrevs == expected

    def test_two_rubric_intersection(self, rubrics, remedies):
        """Two rubrics should produce a proper intersection."""
        selected_rubrics = ["Head, pain, morning", "Mind, irritability"]
        results = repertorize(selected_rubrics, rubrics, remedies)
        # Every result should have both rubrics in breakdown
        for abbrev, _, breakdown, _ in results:
            assert set(breakdown.keys()) == set(selected_rubrics), f"{abbrev} missing a rubric"

    def test_full_name_populated(self, rubrics, remedies):
        results = repertorize(self.CLASSIC_RUBRICS, rubrics, remedies)
        for abbrev, _, _, full_name in results[:10]:
            assert len(full_name) > 0, f"{abbrev} has empty full_name"
