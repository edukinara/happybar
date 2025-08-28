# Multi-stage Docker build for Happy Bar API
FROM node:22-alpine AS base

# Install pnpm
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.base.json ./

# Copy only backend-related packages
COPY packages packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build only backend packages needed for API
RUN pnpm run build --filter='@happy-bar/types' --filter='@happy-bar/pos' --filter='@happy-bar/database' --filter='@happy-bar/api'

# Production stage
FROM node:22-alpine AS production

# Install pnpm
RUN npm install -g pnpm@latest

# Add database migration tools
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy workspace configuration and package files
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/pnpm-lock.yaml ./

# Copy only the packages we need
COPY --from=base /app/packages/api/package.json ./packages/api/
COPY --from=base /app/packages/api/dist/ ./packages/api/dist/
COPY --from=base /app/packages/database/ ./packages/database/
COPY --from=base /app/packages/types/ ./packages/types/
COPY --from=base /app/packages/pos/ ./packages/pos/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Debug: List the structure to verify files are copied correctly
RUN echo "=== Listing /app/packages/api/dist structure ===" && \
    find /app/packages/api/dist -type f | head -20

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory to nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start script that runs migrations then starts the app
# For Neon: Migrations use DIRECT_URL, application uses DATABASE_URL
CMD ["sh", "-c", "cd packages/database && npx prisma migrate deploy && cd ../.. && node packages/api/dist/index.js"]