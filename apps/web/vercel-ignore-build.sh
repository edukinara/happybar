#!/bin/bash

# This script tells Vercel when to skip builds using Turborepo
# Exit code 0 means "skip build", 1 means "build"

echo "🔍 Checking for changes in web app and dependencies..."

# Use turbo to check if web app needs rebuilding
# This considers all dependencies automatically
npx turbo run build --filter=@happy-bar/web --dry=json > turbo-dry-run.json

# Check if any tasks would run (meaning there are changes)
TASKS_TO_RUN=$(cat turbo-dry-run.json | grep -o '"tasks":\[[^]]*\]' | grep -v '"tasks":\[\]')

if [ -z "$TASKS_TO_RUN" ]; then
  echo "✅ No changes detected by Turborepo - skipping build"
  rm -f turbo-dry-run.json
  exit 0
else
  echo "🔄 Changes detected by Turborepo - proceeding with build"
  rm -f turbo-dry-run.json
  exit 1
fi