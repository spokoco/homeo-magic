#!/usr/bin/env python3
"""
Format remedy markdown files for better readability.
Uses LLM to clean up OCR artifacts, improve paragraph structure,
add proper markdown formatting while preserving Kent's exact words.

Usage: python3 format_markdown_batch.py <batch_num> <total_batches>
"""

import sys
import subprocess
from pathlib import Path

REPO_DIR = Path(__file__).parent.parent
MD_DIR = REPO_DIR / "data" / "kent" / "materia_medica" / "remedy_markdown"

def get_md_files():
    return sorted(MD_DIR.glob("*.md"))

def format_remedy(filepath, batch_num, idx, total):
    remedy_text = filepath.read_text()
    remedy_name = filepath.stem.replace("_", " ").title()
    
    prompt = """You are a book formatter. Clean up this OCR'd text from Kent's Lectures on Materia Medica.

RULES:
- PRESERVE Kent's exact words. Do not rewrite, summarize, or paraphrase.
- Fix OCR artifacts (garbled characters, wrong punctuation, "tests" -> "testes" where clearly about anatomy)
- Add proper markdown formatting:
  - # for the remedy name heading (already there)
  - ## for major section headers (Mind, Head, Stomach, Chest, Abdomen, etc.)
  - Proper paragraph breaks between distinct topics
  - Use > blockquote for Kent's direct quotes from provings (lines that start with quotes)
  - Use **bold** for remedy names mentioned in comparisons
  - Use *italic* for Latin/remedy abbreviations
- Clean up excessive whitespace and line breaks
- Do NOT add content that isn't in the original
- Do NOT remove any content
- Output the full formatted markdown

Output ONLY the formatted markdown, no commentary."""

    result = subprocess.run(
        ["claude", "--permission-mode", "bypassPermissions", "--print", prompt],
        input=remedy_text,
        capture_output=True,
        text=True,
        timeout=180
    )
    
    if result.returncode == 0 and len(result.stdout.strip()) > len(remedy_text) * 0.5:
        filepath.write_text(result.stdout.strip() + "\n")
        print(f"  [{batch_num}] ({idx}/{total}) Formatted: {remedy_name} ({len(result.stdout)} chars)")
        return True
    else:
        print(f"  [{batch_num}] ({idx}/{total}) FAILED: {remedy_name} - keeping original")
        return False

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 format_markdown_batch.py <batch_num> <total_batches>")
        sys.exit(1)
    
    batch_num = int(sys.argv[1])
    total_batches = int(sys.argv[2])
    
    files = get_md_files()
    batch_size = len(files) // total_batches
    start = batch_num * batch_size
    end = len(files) if batch_num == total_batches - 1 else start + batch_size
    batch = files[start:end]
    
    print(f"[Batch {batch_num+1}/{total_batches}] Formatting {len(batch)} files ({batch[0].stem} - {batch[-1].stem})")
    
    success = 0
    for i, f in enumerate(batch, 1):
        if format_remedy(f, batch_num+1, i, len(batch)):
            success += 1
    
    print(f"\n[Batch {batch_num+1}/{total_batches}] COMPLETE. {success}/{len(batch)} formatted.")

if __name__ == "__main__":
    main()
