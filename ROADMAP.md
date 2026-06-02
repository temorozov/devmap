# Roadmap

Short, actionable improvements based on the current repo state.

## Recently Done (cleanup pass)

- Removed the half-implemented `requirements` feature and added `20260602000000_drop_node_requirements` so schema and DB agree.
- Added `AI_BATCH_OPENAI_MODEL` to env examples; removed dead Gemini code/config (OpenAI is the only provider).
- Added npm scripts for build, lint, test, and e2e.
- Added DTOs + a global `ValidationPipe`; removed all `any` lint errors; lint is clean across projects.
- Added rate limiting (`@nestjs/throttler`) on AI generation/batch endpoints.
- Validate AI-generated skill JSON (including `parentIndex` bounds) before saving nodes.

## UI/UX Improvements

- Show clearer AI generation states in the canvas: loading, success, retryable error, configuration error.
- Make the guest AI restriction visible before the user opens the AI modal.
- Add batch job status UI if background node-description generation is meant to be user-facing.
- Improve shared-tree read-only behavior so owners/editors and viewers have clear interaction differences.
- Surface API errors consistently through the existing dialog service.

## Backend/API Improvements

- Add DTOs and validation for tree, node, AI generation, and batch endpoints.
- Make shared-token reads clearly separate from authenticated owner reads.
- Add API docs for auth, tree, node, shared tree, and batch job endpoints.

## Database Improvements

- Review indexes for common queries like user tree lists, tree nodes, and tree activity lookups.
- Decide whether node `progress` is stored independently or derived from `level / maxLevel`.
- Add migration guidance for dev vs prod in docs.
- Review cascade behavior for deleting trees, users, nodes, activities, and batch jobs.

## Deploy/Security Improvements

- Ensure env examples include every variable used by backend and frontend runtime code.
- Add a predeploy check for Prisma schema/migration consistency.
- Document required vs optional env vars in one place.
- Keep Postgres publishing limited to `docker-compose.dev.yml`; production compose currently keeps it internal.
- Review OAuth callback/origin handling after current auth/config changes settle.

## Technical Debt

- Consolidate duplicated CORS localhost expansion logic.
- Move AI prompt/schema validation into shared helpers with tests.
- Add focused tests for tree generation saving logic and invalid AI output.
- Add frontend tests around guest AI blocking and generation errors.
- Reduce controller/service `any` usage.
- Keep `PROJECT_CONTEXT.md`, `AGENTS.md`, and README aligned as the repo changes.
