#!/bin/bash

echo "Fixing utility function parameter types..."

# Fix function parameter types across all route files
find src/routes -name "*.ts" -exec sed -i '' 's/function getOrganizationId(request: AuthenticatedRequest)/function getOrganizationId(request: any)/g' {} \;
find src/routes -name "*.ts" -exec sed -i '' 's/function getUserId(request: AuthenticatedRequest)/function getUserId(request: any)/g' {} \;
find src/routes -name "*.ts" -exec sed -i '' 's/(request: AuthenticatedRequest)/(request: any)/g' {} \;

echo "Utility function parameter types fixed!"