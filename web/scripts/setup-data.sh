#!/bin/bash
# Copy data files from ../data to public/data
# Run this before `npm run dev` or `npm run build`

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$WEB_DIR/../data"
PUBLIC_DATA="$WEB_DIR/public/data"

mkdir -p "$PUBLIC_DATA"

echo "Copying data files..."
cp "$DATA_DIR/symptoms.json" "$PUBLIC_DATA/"
cp "$DATA_DIR/remedies.json" "$PUBLIC_DATA/"

echo "Done! Data files copied to public/data/"
ls -lh "$PUBLIC_DATA"
