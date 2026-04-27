# Roadmap

Short, actionable improvements based on the current repo state.

## Quick Fixes

- Add `requirements` back to `prisma/schema.prisma` or remove/replace the migration that added it.
- Add `AI_BATCH_OPENAI_MODEL` to `.env.example` and `.env.production.example`.
- Align docs/env examples with actual AI provider behavior: current `AiService` only attempts OpenAI.
- Add npm scripts for common Nx commands like build, lint, test, and e2e.
- Validate AI-generated skill JSON shape, especially `parentIndex`, before saving nodes.

## UI/UX Improvements

- Show clearer AI generation states in the canvas: loading, success, retryable error, configuration error.
- Make the guest AI restriction visible before the user opens the AI modal.
- Add batch job status UI if background node-description generation is meant to be user-facing.
- Improve shared-tree read-only behavior so owners/editors and viewers have clear interaction differences.
- Surface API errors consistently through the existing dialog service.

## Backend/API Improvements

- Add DTOs and validation for tree, node, AI generation, and batch endpoints.
- Replace remaining `any` request/body types in controllers and services.
- Make shared-token reads clearly separate from authenticated owner reads.
- Normalize AI provider config: either restore provider selection/fallback or remove unused Gemini config.
- Add stronger parsing and validation for OpenAI Responses output before database writes.
- Add API docs for auth, tree, node, shared tree, and batch job endpoints.

## Database Improvements

- Resolve the `Node.requirements` schema/migration mismatch.
- Review indexes for common queries like user tree lists, tree nodes, and tree activity lookups.
- Decide whether node `progress` is stored independently or derived from `level / maxLevel`.
- Add migration guidance for dev vs prod in docs.
- Review cascade behavior for deleting trees, users, nodes, activities, and batch jobs.

## Deploy/Security Improvements

- Ensure env examples include every variable used by backend and frontend runtime code.
- Add a predeploy check for Prisma schema/migration consistency.
- Document required vs optional env vars in one place.
- Keep Postgres publishing limited to `docker-compose.dev.yml`; production compose currently keeps it internal.
- Add rate limiting or usage limits for AI generation endpoints.
- Review OAuth callback/origin handling after current auth/config changes settle.

## Technical Debt

- Consolidate duplicated CORS localhost expansion logic.
- Remove stale Gemini code/config or make provider fallback real again.
- Move AI prompt/schema validation into shared helpers with tests.
- Add focused tests for tree generation saving logic and invalid AI output.
- Add frontend tests around guest AI blocking and generation errors.
- Reduce controller/service `any` usage.
- Keep `PROJECT_CONTEXT.md`, `AGENTS.md`, and README aligned as the repo changes.
