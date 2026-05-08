#!/bin/bash
# Syncs the workspace database types into supabase/functions/_shared/
# Edge functions run in Deno and can't import workspace packages, so we copy.
# Run this before `supabase functions deploy` whenever the schema changes.
set -e
SOURCE="packages/db/src/database.types.ts"
TARGET="supabase/functions/_shared/database.types.ts"

if [ ! -f "$SOURCE" ]; then
  echo "✗ source missing: $SOURCE"
  exit 1
fi

cp "$SOURCE" "$TARGET"
echo "✓ database.types synced ($SOURCE → $TARGET)"
