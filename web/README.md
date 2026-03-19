# Homeo-Magic Web UI

A web-based repertorization tool for homeopathy. Find remedies that match multiple symptoms, ranked by total score.

## Features

- **Symptom Search**: Autocomplete search across 74,000+ symptoms
- **Session Memory**: Recently selected symptoms appear first in suggestions
- **Intersection Matching**: Only shows remedies present in ALL selected symptoms
- **Score Ranking**: Remedies ranked by total score (sum of weights 1-3)
- **Score Breakdown**: Expandable view showing contribution per symptom

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript

## Getting Started

```bash
# Install dependencies
npm install

# Copy data files (automatic with npm run dev/build)
npm run setup

# Run development server
npm run dev

# Or build for production
npm run build
npm run start
```

## Data Files

The app loads symptom and remedy data from `public/data/`:
- `symptoms.json` - 74,481 symptoms with remedy weights
- `remedies.json` - 2,432 remedy abbreviations and full names

These are copied from `../data/` by the setup script.

## Algorithm

The repertorization algorithm (ported from `../engine/repertorize.py`):

1. For each selected symptom, gather all remedies and their weights
2. Filter to only remedies that appear in **all** selected symptoms (intersection)
3. Sum the weights for each remedy across symptoms
4. Sort by total score descending

This ensures results are highly specific — a remedy must address every selected symptom to appear.
