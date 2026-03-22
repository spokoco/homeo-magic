# Kent's Materia Medica Integration Plan

## Overview

Integrate Kent's "Lectures on Materia Medica" into Homeo-Magic to cross-reference repertory results with materia medica passages.

## Decisions (confirmed by David)

1. **Batch processing** with sub-agents, progress reports every 10 minutes
2. **Hybrid fuzzy matching** -- text search pre-filter, then LLM analysis of surrounding context
3. **Flat JSON files** -- same approach as existing system
4. **Markdown rendering** -- infer document structure from OCR text, store as Markdown, render in Markdown viewer
5. **Test-driven development** -- write tests first

## Data Source

- Book: https://archive.org/details/kents-lectures-on-materia-medica
- Best format: `_djvu.txt` (2.5MB plain text, OCR'd)
- Page mapping: `_page_numbers.json`
- PDF also available for reference

## Data Schema

```
data/
  kent/
    materia_medica/
      raw_text.txt           # Downloaded OCR text
      page_numbers.json      # Page mapping from archive.org
      remedy_sections.json   # Book split by remedy chapter
      remedy_markdown/       # Clean markdown per remedy
        nux_vomica.md
        sulphur.md
        ...
      rubric_index.json      # remedy+rubric -> passages
      profiles.json          # personality/constitutional profiles
```

## Exploration Phase (before full build)

Test with: Nux Vomica, Sulphur, Colocynthis/Chamomilla
Validate: parser, matching pipeline, output quality
Report: examples, source material structure in docs/

## Pipeline

1. Download & parse book text
2. Split into remedy chapters
3. Convert to clean Markdown
4. Keyword pre-filter: find candidate rubric matches
5. LLM pass: analyze context, confirm matches, extract passages
6. LLM pass: generate constitutional/personality profiles
7. Output JSON index files
