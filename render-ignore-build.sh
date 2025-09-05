#!/bin/bash

# Render build ignore script
# This checks if API-related files have changed
# Place this in your Render service settings under "Build Command"

echo "🔍 Checking for API changes..."

# Check if any API-related files have changed
git diff HEAD^ HEAD --quiet -- packages/api packages/database packages/pos packages/types Dockerfile.render render.yaml

if [ $? -eq 0 ]; then
  echo "✅ No changes in API dependencies - creating empty build"
  # Create a minimal successful build that does nothing
  mkdir -p dist
  echo "echo 'No changes, skipping deployment'" > dist/skip.js
  exit 0
else
  echo "🔄 Changes detected - proceeding with normal build"
  # Continue with normal Docker build
  exit 1
fi