# Capability Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the project from image-only routing to a Codex single-conversation multi-model capability router.

**Architecture:** Add a `CapabilityRouter` that selects routes by capability while preserving `generate_image` as a specialized image entrypoint. Add a `ccswitch` module that reads provider metadata and secrets from the local `.cc-switch` store without persisting tokens in project config.

**Tech Stack:** TypeScript, Node.js, Vitest, MCP SDK, native HTTP server, Python standard-library sqlite3 for read-only cc-switch database access.

---

### Task 1: Capability Config Schema

**Files:**
- Modify: `src/config/schema.ts`
- Modify: `src/config/defaults.ts`
- Modify: `src/config/configStore.ts`
- Test: `tests/configStore.test.ts`

- [ ] Add `CapabilityRoute`, `defaultRoutes`, and `activeRouteId`.
- [ ] Keep legacy `profiles` accepted for migration.
- [ ] Migrate the default mock image profile into a mock image route.
- [ ] Verify old config files still load.

### Task 2: cc-switch Reader

**Files:**
- Create: `src/ccswitch/types.ts`
- Create: `src/ccswitch/pythonReader.ts`
- Create: `src/ccswitch/index.ts`
- Test: `tests/ccswitch.test.ts`

- [ ] Read `settings.json`.
- [ ] Read Codex providers from `cc-switch.db` through Python sqlite3 in read-only mode.
- [ ] Parse model, base URL, wire API, and secret availability.
- [ ] Return only sanitized provider metadata from list functions.
- [ ] Resolve provider token only for runtime requests.

### Task 3: Capability Router

**Files:**
- Create: `src/router/capabilityRouter.ts`
- Modify: `src/router/providers.ts`
- Modify: `src/router/types.ts`
- Test: `tests/capabilityRouter.test.ts`
- Test: `tests/imageRouter.test.ts`

- [ ] Implement `callModel` for OpenAI-compatible Responses API.
- [ ] Support env and cc-switch secret sources.
- [ ] Route image generation by `image` capability.
- [ ] Keep existing mock image behavior.
- [ ] Keep legacy `ImageRouter` as a wrapper if useful.

### Task 4: MCP Tools

**Files:**
- Modify: `src/mcp/server.ts`

- [ ] Add `call_model`.
- [ ] Update `generate_image` to route through `CapabilityRouter`.
- [ ] Rename visible text from image router to capability router.
- [ ] Keep `get_config` and `get_config_page_url`.

### Task 5: HTTP API and UI

**Files:**
- Modify: `src/http/server.ts`
- Modify: `src/http/static/index.html`
- Test: `tests/httpServer.test.ts`

- [ ] Add `GET /api/ccswitch/providers`.
- [ ] Add `POST /api/config/sync-ccswitch`.
- [ ] Render routes by capability.
- [ ] Add one-click cc-switch sync.
- [ ] Show sanitized status only.

### Task 6: Docs and Verification

**Files:**
- Modify: `docs/product/01-requirements-clarification.md`
- Modify: `docs/engineering/04-tech-decisions.md`
- Modify: `docs/development/03-feature-changelog.md`
- Modify: `docs/development/10-current-status.md`
- Modify: `docs/handoff/05-handoff-guide.md`
- Modify: `docs/operations/07-local-development.md`

- [ ] Update project docs to describe capability routing.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run plugin validation.
- [ ] Restart config server if needed.
