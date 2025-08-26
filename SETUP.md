# Happy Bar - Setup Guide

This guide will help you get the Happy Bar inventory management system running locally.

## Prerequisites

Ensure you have the following installed:
- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm 8+** - `npm install -g pnpm`
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/) or use Docker
- **Redis 6+** - [Download](https://redis.io/download) or use Docker

## Quick Start with Docker (Recommended)

If you have Docker installed, you can quickly start the required services:

```bash
# Start PostgreSQL and Redis
docker run -d --name happy-bar-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=happy_bar \
  -p 5432:5432 \
  postgres:15

docker run -d --name happy-bar-redis \
  -p 6379:6379 \
  redis:7-alpine
```

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd happy-bar

# Install all dependencies using pnpm workspaces
pnpm install
```

### 2. Environment Configuration

```bash
# Copy example environment files
cp packages/api/.env.example packages/api/.env
cp packages/database/prisma/.env.example packages/database/prisma/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Configure Database Connection

Edit `packages/api/.env` and `packages/database/prisma/.env`:

```bash
# packages/api/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/happy_bar"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# packages/database/prisma/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/happy_bar"
```

### 4. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

### 5. Start Development

```bash
# Start all services in development mode
pnpm dev
```

This will start:
- **API Server**: http://localhost:3001
- **Web Application**: http://localhost:3000
- **API Documentation**: http://localhost:3001/docs

## Demo Access

After seeding, you can log in with:

- **Email**: `admin@demo.com`
- **Password**: `demo123`  
- **Domain**: `demo` (optional)

## Verification

### Test API
```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Test Web App
Visit http://localhost:3000 - you should see the login page.

## Available Scripts

From the root directory:

```bash
# Development
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm typecheck        # TypeScript type checking

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes (dev only)
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio
pnpm db:reset         # Reset database (destructive!)
```

## Package-Specific Development

### Backend API Development
```bash
cd packages/api
pnpm dev              # Start API server with hot reload
pnpm typecheck        # Check TypeScript
```

### Frontend Development
```bash
cd apps/web
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production
pnpm lint             # Lint React code
```

### Database Development
```bash
cd packages/database
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Create new migration
pnpm db:seed          # Seed database
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
psql -h localhost -U postgres -d happy_bar

# Reset database if corrupted
pnpm db:reset
pnpm db:seed
```

### Port Conflicts
If ports 3000 or 3001 are in use:
```bash
# Change API port in packages/api/.env
PORT=3002

# Change web port
cd apps/web
pnpm dev -- -p 3001
```

### Missing Dependencies
```bash
# Clean and reinstall
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install
```

### TypeScript Errors
```bash
# Rebuild all packages
pnpm clean
pnpm build
```

## Production Deployment

For production deployment, see the main README.md for detailed instructions on:
- Environment variable configuration
- Database migration strategies  
- SSL/HTTPS setup
- Docker deployment
- CI/CD pipeline setup

## Next Steps

1. **Customize your tenant**: Update demo data in `packages/database/prisma/seed.ts`
2. **Add products**: Use the web interface to add your inventory items
3. **Configure POS**: Set up POS integrations in the settings
4. **Start counting**: Begin your first inventory count
5. **Explore analytics**: View variance reports and insights

## Support

If you encounter issues:
1. Check the logs: `pnpm dev` shows all service logs
2. Verify database connection: `pnpm db:studio`
3. Review environment variables in `.env` files
4. Check the troubleshooting section above

Happy inventory management! 🍻