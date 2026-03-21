#!/bin/bash
# Copy data files from ../data to public/data
# Run this before `npm run dev` or `npm run build`

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$WEB_DIR/../data"
PUBLIC_DATA="$WEB_DIR/public/data"

mkdir -p "$PUBLIC_DATA"

KENT_DATA="$DATA_DIR/kent/materia_medica"
PUBLIC_KENT="$PUBLIC_DATA/kent"

echo "Copying data files..."
cp "$DATA_DIR/symptoms.json" "$PUBLIC_DATA/"
cp "$DATA_DIR/remedies.json" "$PUBLIC_DATA/"

# Copy Kent materia medica data
if [ -d "$KENT_DATA" ]; then
  mkdir -p "$PUBLIC_KENT/remedy_markdown"
  cp "$KENT_DATA/profiles.json" "$PUBLIC_KENT/"
  cp "$KENT_DATA/symptom_index.json" "$PUBLIC_KENT/"
  cp "$KENT_DATA/remedy_markdown/"*.md "$PUBLIC_KENT/remedy_markdown/"
  echo "Kent materia medica data copied."
fi

echo "Done! Data files copied to public/data/"
ls -lh "$PUBLIC_DATA"
