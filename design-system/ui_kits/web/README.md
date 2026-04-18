# Homeo-Magic · Web UI kit

High-fidelity recreation of the Homeo-Magic web product, styled with the Geigy-inspired design system (ink, sage, teal, paper).

## Files
- `index.html` — interactive prototype: search → rubrics → matrix → remedy + lecture
- `Components.jsx` — shared chrome (HeaderBar, SearchPanel, FooterBar, EmptyState, GradeCell, Icon set)
- `Matrix.jsx` — AnalysisMatrix, RemedyDetail, LecturePanel, mock data + scoring logic

## What's real
- Live rubric search with autocomplete and keyboard nav
- Add / remove / hide rubrics → matrix recomputes intersection + scores
- Click remedy column → Kent's lecture panel + cross-references populate
- Pivot hover: row + column highlight in the matrix
- Grade heat (1/2/3) on cells + score row

## What's mocked
- 6 rubrics × 13 remedies of mock data (real product has 74k × 2.4k)
- Lecture text is a short stand-in; real product loads lazy-split markdown
- No reorder-by-drag, no mobile layout switch, no color settings page

See `../../README.md` for the system this UI kit is built on.
