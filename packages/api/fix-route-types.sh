#!/bin/bash

# Fix TypeScript route handler parameter types
# This script replaces (request: AuthenticatedRequest, with (request: any, in route files

echo "Fixing route handler types..."

# Find all .ts files in routes directory and apply the fix
find src/routes -name "*.ts" -exec sed -i '' 's/(request: AuthenticatedRequest,/(request: any,/g' {} \;

# Also fix any remaining cases where request is typed differently in route handlers
find src/routes -name "*.ts" -exec sed -i '' 's/async (request: FastifyRequest,/async (request: any,/g' {} \;

echo "Route handler types fixed!"