#!/usr/bin/env python3
"""
Process a batch of Kent's Materia Medica remedy chapters.
For each remedy:
1. Keyword pre-filter: match passages against rubric database
2. Generate rubric cross-reference index
3. Generate constitutional/personality profile

Usage: python3 process_materia_batch.py <batch_num> <total_batches>
"""

import json
import sys
import os
import subprocess
from pathlib import Path
from datetime import datetime

REPO_DIR = Path(__file__).parent.parent
DATA_DIR = REPO_DIR / "data"
MM_DIR = DATA_DIR / "kent" / "materia_medica"
MD_DIR = MM_DIR / "remedy_markdown"
OUTPUT_DIR = MM_DIR / "processed"

def load_rubrics():
    with open(DATA_DIR / "symptoms.json") as f:
        return json.load(f)

def load_remedies():
    with open(DATA_DIR / "remedies.json") as f:
        return json.load(f)

def get_remedy_files():
    files = sorted(MD_DIR.glob("*.md"))
    return files

def extract_remedy_name(filepath):
    """Get display name from markdown file."""
    with open(filepath) as f:
        first_line = f.readline().strip()
    if first_line.startswith("# "):
        return first_line[2:]
    return filepath.stem.replace("_", " ").title()

def find_matching_rubrics(remedy_abbrevs, rubrics_db):
    """Find all rubrics that list any of this remedy's abbreviations."""
    matching = {}
    for rubric_path, data in rubrics_db.items():
        for abbrev in remedy_abbrevs:
            if abbrev in data.get("remedies", {}):
                grade = data["remedies"][abbrev]
                matching[rubric_path] = grade
                break
    return matching

def get_remedy_abbreviations(remedy_name, remedies_db):
    """Find abbreviation(s) for a remedy name."""
    abbrevs = []
    name_lower = remedy_name.lower()
    for abbrev, full_name in remedies_db.items():
        if full_name.lower() == name_lower or name_lower in full_name.lower() or full_name.lower() in name_lower:
            abbrevs.append(abbrev)
    return abbrevs

def call_llm_profile(remedy_name, remedy_text):
    """Call Claude to generate constitutional profile."""
    prompt = f"""You are a homeopathic materia medica analyst. Read this Kent lecture on {remedy_name}.

Produce a constitutional profile in this exact JSON format:
{{
  "personality": "2-3 sentences on general personality type",
  "mental_state": "2-3 sentences on key mental characteristics",
  "emotional_pattern": "2-3 sentences on core emotional traits"
}}

Output ONLY valid JSON, no commentary."""

    result = subprocess.run(
        ["claude", "--permission-mode", "bypassPermissions", "--print", prompt],
        input=remedy_text,
        capture_output=True,
        text=True,
        timeout=120
    )
    
    output = result.stdout.strip()
    # Try to extract JSON from output
    try:
        # Find JSON in output
        start = output.index("{")
        end = output.rindex("}") + 1
        return json.loads(output[start:end])
    except (ValueError, json.JSONDecodeError) as e:
        return {"personality": "Profile generation failed", "mental_state": "", "emotional_pattern": "", "error": str(e)}

def call_llm_rubric_match(remedy_name, remedy_text, rubric_list):
    """Call Claude to match rubrics to passages."""
    rubrics_str = "\n".join(f"- {s}" for s in rubric_list[:30])  # Limit to top 30

    prompt = f"""You are a homeopathic materia medica analyst. Read this Kent lecture on {remedy_name}.

For each rubric below, find the most relevant passage from Kent's text. Quote Kent directly.
If no relevant passage exists, output "No specific passage found."

Rubrics:
{rubrics_str}

Output as JSON: a dictionary mapping each rubric string to Kent's quote (string).
Output ONLY valid JSON, no commentary."""

    result = subprocess.run(
        ["claude", "--permission-mode", "bypassPermissions", "--print", prompt],
        input=remedy_text,
        capture_output=True,
        text=True,
        timeout=180
    )
    
    output = result.stdout.strip()
    try:
        start = output.index("{")
        end = output.rindex("}") + 1
        return json.loads(output[start:end])
    except (ValueError, json.JSONDecodeError) as e:
        return {s: f"Matching failed: {e}" for s in rubric_list[:30]}

def process_remedy(filepath, rubrics_db, remedies_db, batch_num):
    """Process a single remedy chapter."""
    remedy_name = extract_remedy_name(filepath)
    remedy_text = filepath.read_text()

    # Find abbreviations
    abbrevs = get_remedy_abbreviations(remedy_name, remedies_db)

    # Find rubrics that reference this remedy
    if abbrevs:
        matching_rubrics = find_matching_rubrics(abbrevs, rubrics_db)
        # Sort by grade descending, take top 30
        top_rubrics = sorted(matching_rubrics.items(), key=lambda x: -x[1])[:30]
        rubric_names = [s[0] for s in top_rubrics]
    else:
        matching_rubrics = {}
        rubric_names = []

    result = {
        "remedy": remedy_name,
        "abbreviations": abbrevs,
        "total_rubrics_in_repertory": len(matching_rubrics),
        "file": filepath.name,
    }

    # LLM: Generate profile
    print(f"  [{batch_num}] Generating profile for {remedy_name}...")
    result["profile"] = call_llm_profile(remedy_name, remedy_text)

    # LLM: Match rubrics to passages
    if rubric_names:
        print(f"  [{batch_num}] Matching {len(rubric_names)} rubrics for {remedy_name}...")
        result["rubric_passages"] = call_llm_rubric_match(remedy_name, remedy_text, rubric_names)
    else:
        result["rubric_passages"] = {}
    
    return result

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 process_materia_batch.py <batch_num> <total_batches>")
        sys.exit(1)
    
    batch_num = int(sys.argv[1])
    total_batches = int(sys.argv[2])
    
    # Load data
    rubrics_db = load_rubrics()
    remedies_db = load_remedies()
    remedy_files = get_remedy_files()
    
    # Split into batches
    batch_size = len(remedy_files) // total_batches
    start_idx = batch_num * batch_size
    if batch_num == total_batches - 1:
        end_idx = len(remedy_files)  # Last batch gets remainder
    else:
        end_idx = start_idx + batch_size
    
    batch_files = remedy_files[start_idx:end_idx]
    
    print(f"[Batch {batch_num+1}/{total_batches}] Processing {len(batch_files)} remedies ({start_idx}-{end_idx-1})")
    print(f"  First: {batch_files[0].stem}")
    print(f"  Last:  {batch_files[-1].stem}")
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    results = []
    for i, filepath in enumerate(batch_files):
        remedy_name = extract_remedy_name(filepath)
        print(f"\n[{batch_num+1}] ({i+1}/{len(batch_files)}) Processing: {remedy_name}")
        
        try:
            result = process_remedy(filepath, rubrics_db, remedies_db, batch_num+1)
            results.append(result)
            
            # Save incrementally
            output_file = OUTPUT_DIR / f"batch_{batch_num}.json"
            with open(output_file, "w") as f:
                json.dump(results, f, indent=2)
            
            print(f"  [{batch_num+1}] Done: {remedy_name} ({len(result.get('rubric_passages', {}))} passages)")
            
        except Exception as e:
            print(f"  [{batch_num+1}] ERROR on {remedy_name}: {e}")
            results.append({"remedy": remedy_name, "error": str(e), "file": filepath.name})
    
    # Final save
    output_file = OUTPUT_DIR / f"batch_{batch_num}.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n[Batch {batch_num+1}/{total_batches}] COMPLETE. {len(results)} remedies processed.")
    print(f"Output: {output_file}")

if __name__ == "__main__":
    main()
