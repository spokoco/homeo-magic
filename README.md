# Homeo-Magic

A structured database and lookup tool for homeopathic repertorization — finding remedies by rubric intersection.

## How Repertorization Works

The clinical workflow:

1. **Patient presents** with multiple symptoms
2. **Look up each rubric** in a repertory (like Kent's)
3. **Each rubric returns** a list of remedies (with grades)
4. **Find the intersection** — remedies that appear for ALL rubrics
5. **Rank by total score** — sum of grades across rubrics

### Example

```
Patient symptoms:
  1. "headache, worse in morning"
  2. "irritability" 
  3. "worse from cold"

Lookup results:
  Rubric 1: [Nux-v(3), Bry(2), Sulph(1), Nat-m(2), Calc(1)]
  Rubric 2: [Nux-v(3), Bry(1), Sulph(2), Sep(2), Lyc(1)]
  Rubric 3: [Nux-v(2), Bry(2), Sulph(3), Ars(3), Hep(2)]

Step 1 — Find intersection (remedies appearing in ALL lists):
  Nux-v, Bry, Sulph

Step 2 — Sum grades across rubrics:
  Nux-v:  3 + 3 + 2 = 8  ← highest
  Sulph:  1 + 2 + 3 = 6
  Bry:    2 + 1 + 2 = 5  ← lowest

Step 3 — Rank by total score:
  1. Nux vomica (8)
  2. Sulphur (6)
  3. Bryonia (5)
```

**Key insight:** It's not just "appears in all lists" — it's "appears *strongly* in all lists." The remedy with the highest **total grade score** is the best match.

### Grading System

The grade (1-3) indicates how strongly a remedy is associated with that rubric:

- **Grade 3** (bold in original texts): Primary/strongly indicated
- **Grade 2** (italic): Secondary indication  
- **Grade 1** (plain): Minor/occasional indication

A remedy scoring grade 3 across multiple rubrics is a much stronger match than one scoring grade 1 everywhere.

---

## Data Model

```json
{
  "rubrics": {
    "head/pain/morning": {
      "remedies": {
        "Nux-v": 3,
        "Bry": 2,
        "Puls": 1,
        "Nat-m": 2,
        "Calc": 1
      },
      "chapter": "Head",
      "section": "Pain",
      "subsection": "Morning"
    }
  }
}
```

### Index Files

| File | Purpose |
|------|---------|
| `symptoms.json` | Main index: rubric path → remedies + grades |
| `search_index.json` | Keyword search for finding rubrics |
| `hierarchy.json` | Browsable tree structure |
| `remedies.json` | Remedy abbreviations → full names |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   homeo-magic                    │
├─────────────────────────────────────────────────┤
│  1. SCRAPER                                      │
│     - Fetch Kent's Repertory (chapter by chapter)│
│     - Parse rubric hierarchy (Head > Pain > AM)  │
│     - Extract remedies + grades                  │
│     - Output: symptoms.json                      │
├─────────────────────────────────────────────────┤
│  2. INDEX                                        │
│     - symptoms.json: rubric → remedies + grades  │
│     - search_index.json: keyword search          │
│     - hierarchy.json: browsable tree             │
├─────────────────────────────────────────────────┤
│  3. LOOKUP ENGINE                                │
│     - Input: list of rubrics                     │
│     - Find intersection: remedies in ALL lists   │
│     - Score each: sum of grades across rubrics   │
│     - Output: remedies ranked by total score     │
├─────────────────────────────────────────────────┤
│  4. WEB UI                                       │
│     - Next.js + Vite + React + Tailwind CSS      │
│     - Rubric autocomplete input                  │
│     - Multi-select with ranked results           │
└─────────────────────────────────────────────────┘
```

---

## Data Sources

### Primary: Kent's Repertory

James Tyler Kent's *Repertory of the Homeopathic Materia Medica* (1897) — the most widely used classical repertory.

**Potential sources:**
- **OOREP** (oorep.com) — may have structured/downloadable data
- **homeoint.org** — full text but messy HTML structure
- **materiamedica.info** — cleaner formatting

### Secondary (future)

- Murphy's Repertory (modern, expanded)
- Boger-Boenninghausen
- Synthesis

---

## Project Structure

```
homeo-magic/
├── data/
│   ├── symptoms.json       # Main rubric → remedy index
│   ├── search_index.json   # Keyword search
│   ├── hierarchy.json      # Browsable tree
│   └── remedies.json       # Abbreviation mappings
├── scraper/
│   ├── kent.py             # Kent's Repertory scraper
│   └── utils.py            # Parsing utilities
├── engine/
│   └── repertorize.py      # Intersection + scoring logic
├── web/                      # Next.js + Vite + React + Tailwind
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## Development Phases

### Phase 1: Data Acquisition
- [ ] Investigate OOREP's data format (may have downloadable JSON)
- [ ] If not, build Kent scraper for cleanest available source
- [ ] Parse rubric hierarchy + remedy grades
- [ ] Output raw symptoms.json

### Phase 2: Index & Search
- [ ] Build keyword search index
- [ ] Implement fuzzy matching for rubric lookup
- [ ] Build intersection algorithm with grade-based scoring

### Phase 3: Web UI

**Tech Stack:** Next.js + Vite + React + Tailwind CSS

**UI Behavior:**

1. **Rubric Input** — Single text field with autocomplete
2. **Autocomplete Priority:**
   - First: rubrics already selected in this session (for quick re-entry)
   - Then: matching rubrics from the repertory database
3. **Selection** — Click to add rubric to list, shows as tag/chip
4. **Results** — Live-updating ranked remedy list as rubrics are added/removed
5. **Remedy Display** — Show total score, breakdown per rubric

**Deployment:** GitHub Pages or Vercel (static export)

**Mockup:**
```
┌─────────────────────────────────────────────────┐
│  🔮 Homeo-Magic                                  │
├─────────────────────────────────────────────────┤
│  Enter rubrics:                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ headache morning ▼                      │    │
│  └─────────────────────────────────────────┘    │
│    ┌──────────────────────────────────┐         │
│    │ • head, pain, morning (prev)     │         │
│    │ • head, pain, morning agg        │         │
│    │ • head, pain, waking on          │         │
│    └──────────────────────────────────┘         │
│                                                  │
│  Selected: [head, pain, morning ×]              │
│            [irritability ×]                     │
│            [cold, agg ×]                        │
│                                                  │
├─────────────────────────────────────────────────┤
│  Remedies (3 found):                            │
│                                                  │
│  1. Nux vomica ............ 8 pts              │
│     morning(3) + irritable(3) + cold(2)        │
│                                                  │
│  2. Sulphur ............... 6 pts              │
│     morning(1) + irritable(2) + cold(3)        │
│                                                  │
│  3. Bryonia ............... 5 pts              │
│     morning(2) + irritable(1) + cold(2)        │
└─────────────────────────────────────────────────┘
```

---

## Open Questions

1. **Source**: Can we get structured data from OOREP, or must we scrape?
2. **Scope**: Start with Kent only, or include other repertories?
3. **Grading**: Preserve full 1-3 grades, or simplify?
4. **Remedies**: Include all ~1500, or focus on polychrests (~100 major)?

---

## Status

🚧 **Planning** — data source investigation next

---

## Appendix: Origin

### Original Prompts

> What are the online free resources for homeopathy practitioners — in particular, things that relate symptoms to fixes

> Take a look at a few of the free books. Can you extract symptoms and relate them to treatments?

> Make a new repo in work, call it Homeo-Magic.

> So the way that these books work is that you look up the symptoms the person presents with in one of the repertories. Then you gather up the suggested remedies for each of the symptoms and then you do the intersection, namely, all the remedies that are in common and then you produce that list. So the scraper that we want to use on Kent has to be designed to be able to access the reference by symptom and reply with remedies — the scraper has to be organized that way.

---

## License

Data sources are public domain (pre-1927). Code is MIT.
