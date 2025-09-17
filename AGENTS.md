# Repository Guidelines

## Project Structure & Module Ownership
- `apps/web` Next.js customer portal; `apps/admin` mirrors structure for operator tooling; `apps/mobile` is the Expo client.
- `packages/api` Fastify service layer; `packages/database` holds Prisma schema, migrations, and seeds; `packages/pos` external POS adapters; `packages/types` shared TypeScript contracts.
- `docs/` and `scripts/` contain operational runbooks, backup utilities, and deployment helpers—keep these in sync when changing infra.

## Build, Test, and Development Commands
- `pnpm install` to hydrate all workspaces; respect the pinned Node 20+ / pnpm 10+ toolchain.
- `pnpm dev` runs Turbo-powered dev servers for web, admin, mobile, and API; use `pnpm dev --filter <package>` for scoped work.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` invoke the matching Turbo pipelines; ensure they pass before pushing.
- Database helpers: `pnpm db:migrate`, `pnpm db:seed`, and `pnpm db:studio` from the repo root manage Prisma migrations and data refreshes.

## Coding Style & Naming
- TypeScript everywhere; favor explicit interfaces over `any` and keep nullable usage deliberate.
- Follow workspace ESLint configs (Next.js + Prettier for frontends, TypeScript ESLint for services). Use two-space indentation and single quotes; run `pnpm lint --filter <package>` before committing.
- Use PascalCase for React components, camelCase for utilities, kebab-case for files, and `useX` prefixes for hooks. Maintain consistent type-imports (`import type { ... }`).

## Testing Expectations
- Keep `pnpm test` green; Turbo expects coverage artifacts under `coverage/`. Co-locate unit specs as `<name>.spec.ts` and integration flows under `tests/` directories.
- Spin up local Postgres/Redis (see `SETUP.md`) before running API tests; seed fixtures with `pnpm db:seed` when tests touch the database.
- Document new test commands inside the owning package’s `package.json` so they participate in the workspace pipeline.

## Commit & Pull Request Workflow
- Mirror existing history: short, imperative commit subjects (e.g., `Add offline sync toggle`). Squash noisy experiments locally.
- Reference issue or Notion IDs in the body when relevant, list risk areas, and note required migrations/seeds.
- PRs should include: clear summary, testing notes (`pnpm test`, `pnpm lint`), screenshots or GIFs for UI changes, and callouts for feature flags or config updates.

## Security & Configuration Tips
- Never commit `.env*` files; copy from the provided examples and update the deployment runbooks when secrets change.
- When touching backup scripts, verify `pnpm db:backup` and `pnpm db:verify` end-to-end before merging.
