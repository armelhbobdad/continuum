#!/bin/bash
# Build script for Tauri desktop - excludes server-only routes incompatible with static export
# Desktop mode bypasses auth, so auth-related routes are also excluded

set -e

# Clean stale build artifacts that might reference excluded routes
rm -rf dist .next

BACKUP_DIR=".desktop-build-backup"
mkdir -p "$BACKUP_DIR"

# Routes to exclude from static export (server-side auth, API routes)
EXCLUDED_ROUTES=(
  "src/app/api"
  "src/app/dashboard"
  "src/app/login"
)

# Auth components only used by excluded routes
EXCLUDED_COMPONENTS=(
  "src/components/sign-in-form.tsx"
  "src/components/sign-up-form.tsx"
)

# Move excluded routes out of the way
for route in "${EXCLUDED_ROUTES[@]}"; do
  if [ -d "$route" ]; then
    mv "$route" "$BACKUP_DIR/$(basename $route)"
    echo "Excluded: $route"
  fi
done

# Move excluded components out of the way
for component in "${EXCLUDED_COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    mv "$component" "$BACKUP_DIR/$(basename $component)"
    echo "Excluded: $component"
  fi
done

# Run the Next.js build
bun run build
BUILD_EXIT_CODE=$?

# Restore excluded routes
for route in "${EXCLUDED_ROUTES[@]}"; do
  backup_name="$BACKUP_DIR/$(basename $route)"
  if [ -d "$backup_name" ]; then
    mv "$backup_name" "$route"
  fi
done

# Restore excluded components
for component in "${EXCLUDED_COMPONENTS[@]}"; do
  backup_name="$BACKUP_DIR/$(basename $component)"
  if [ -f "$backup_name" ]; then
    mv "$backup_name" "$component"
  fi
done

rmdir "$BACKUP_DIR" 2>/dev/null || true
echo "Routes restored"

exit $BUILD_EXIT_CODE
