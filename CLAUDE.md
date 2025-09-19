# Claude Code Project Notes

## Package Management

**IMPORTANT: Always use `pnpm` instead of `npm` for this project.**

This is a pnpm workspace project. Use:

- `pnpm install [package]` or `pnpm add [package]` to install packages
- `pnpm dev`, `pnpm build`, `pnpm start` etc. to run scripts
- Never use `npm install` or `npm run` commands

## Project Structure

This is a monorepo with the following main packages:

- `packages/api` - Fastify backend API
- `packages/database` - Prisma database schema
- `packages/pos` - POS system integrations (Toast)
- `packages/types` - Shared TypeScript types
- `apps/web` - Next.js frontend application

## Environment Configuration

### API Server (`packages/api/.env`)

- `AUTUMN_SECRET_KEY` - Required for subscription management
- `JWT_SECRET` - For authentication
- `REDIS_URL` - For caching and sessions

### Web App (`apps/web/.env`)

- `NEXT_PUBLIC_API_URL` - Backend API URL (http://localhost:3001 for dev, production URL for prod)
- `NEXT_PUBLIC_AUTUMN_PUBLIC_KEY` - Autumn public key for frontend
- `AUTUMN_SECRET_KEY` - Autumn secret key (for SSR if needed)

## Key Integrations

- **Autumn** - Subscription management and billing
- **Toast POS** - Point of sale system integration
- **Prisma** - Database ORM
- **Redis** - Caching and session storage

## Development Commands

From the API directory (`packages/api/`):

- `pnpm dev` - Start development server
- `pnpm build` - Build TypeScript
- `pnpm typecheck` - Run TypeScript checks

From the web app directory (`apps/web/`):

- `pnpm dev` - Start Next.js development server
- `pnpm build` - Build for production

## Database Management

### Schema Changes

**IMPORTANT: Always create migrations for schema changes, never use direct push to production.**

- `pnpm db:migrate` - Create a new migration (interactive, asks for migration name)
- `pnpm db:push` - Only for development/testing (bypasses migrations)
- `pnpm db:generate` - Generate Prisma client after schema changes

When making any changes to `packages/database/prisma/schema.prisma`:

1. Use `pnpm db:migrate` to create a proper migration (this is an interactive command, so we need to pipe in the name of the migration)
2. The command will interactively ask for a descriptive migration name
3. This ensures proper version control and deployment safety
4. Never use `pnpm db:push` for production environments
