# sync-ai Phase 1.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Codex capability router into `sync-ai`, a Beta-ready local plugin/control panel that external users can install, understand, diagnose, and use.

**Architecture:** Keep the current Node.js + TypeScript MCP architecture. Add focused backend modules for diagnostics and call history, then rewrite the static UI into a polished single-page control panel. Keep secrets out of config, docs, UI, and diagnostic output.

**Tech Stack:** Node.js, TypeScript, MCP SDK, Zod, native HTML/CSS/JavaScript, Vitest, Codex plugin manifest.

---

## File Structure

- Modify `package.json`: rename package to `sync-ai`, update description.
- Modify `.codex-plugin/plugin.json`: rename plugin display metadata to sync-ai.
- Modify `.mcp.json`: keep MCP server command, optionally keep server id compatible.
- Modify `src/config/configStore.ts`: migrate default data directory from `CodexImageRouter` to `SyncAI`.
- Create `src/history/historyStore.ts`: append/read/clear local call history.
- Modify `src/router/capabilityRouter.ts`: record history for `callModel` and `generateImage`.
- Create `src/diagnostics/diagnostics.ts`: compute status checks without exposing secrets.
- Modify `src/http/server.ts`: add `/api/diagnostics`, `/api/history`, `/api/history/clear`, `/api/docs/getting-started`.
- Replace `src/http/static/index.html`: polished sync-ai dashboard UI.
- Add tests:
  - `tests/historyStore.test.ts`
  - `tests/diagnostics.test.ts`
  - update `tests/httpServer.test.ts`
  - update router tests if history injection is added.
- Add docs:
  - `README.md`
  - `docs/user-guide/01-getting-started.md`
  - `docs/user-guide/02-installation.md`
  - `docs/user-guide/03-troubleshooting.md`
  - `docs/user-guide/04-github-release-guide.md`

---

### Task 1: Product metadata and safe config path

**Files:**
- Modify: `D:\projects\codex-image-router\package.json`
- Modify: `D:\projects\codex-image-router\.codex-plugin\plugin.json`
- Modify: `D:\projects\codex-image-router\src\config\configStore.ts`
- Test: `D:\projects\codex-image-router\tests\configStore.test.ts`

- [ ] **Step 1: Write failing config path assertion**

Add a test verifying that the default config path uses `SyncAI` when `CODEX_IMAGE_ROUTER_CONFIG` is not set.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm test -- tests/configStore.test.ts
```

Expected: FAIL because default path still contains `CodexImageRouter`.

- [ ] **Step 3: Implement config path migration**

Change `defaultConfigPath()` to use:

```ts
join(process.env.LOCALAPPDATA ?? process.cwd(), "SyncAI", "config.json")
```

- [ ] **Step 4: Rename product metadata**

Set `package.json` name to `sync-ai`, description to Chinese product description. Update `.codex-plugin/plugin.json` name/display text to `sync-ai` while keeping MCP tool compatibility.

- [ ] **Step 5: Verify**

Run:

```powershell
npm test -- tests/configStore.test.ts
npm run build
```

Expected: tests and build pass.

---

### Task 2: Call history module

**Files:**
- Create: `D:\projects\codex-image-router\src\history\historyStore.ts`
- Create: `D:\projects\codex-image-router\tests\historyStore.test.ts`
- Modify: `D:\projects\codex-image-router\src\router\capabilityRouter.ts`

- [ ] **Step 1: Write failing tests**

Tests must verify:

1. New store starts with empty history.
2. `append()` writes newest records first.
3. History is capped at 100 records.
4. `clear()` empties the file.

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- tests/historyStore.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement `HistoryStore`**

Expose:

```ts
export type HistoryRecord = {
  id: string;
  type: "text" | "image";
  routeId: string;
  provider: string;
  model: string;
  status: "success" | "error";
  summary: string;
  imagePath?: string;
  metadataPath?: string;
  createdAt: string;
};

export class HistoryStore {
  constructor(path = defaultHistoryPath()) {}
  read(): Promise<HistoryRecord[]>;
  append(record: HistoryRecord): Promise<HistoryRecord[]>;
  clear(): Promise<void>;
}
```

- [ ] **Step 4: Integrate history into `CapabilityRouter`**

Add optional `historyStore` constructor dependency. On success and failure of real MCP calls, append a sanitized record. Re-throw original errors after recording failures.

- [ ] **Step 5: Verify**

Run:

```powershell
npm test -- tests/historyStore.test.ts tests/capabilityRouter.test.ts tests/imageRouter.test.ts
```

Expected: all pass.

---

### Task 3: Diagnostics module and HTTP API

**Files:**
- Create: `D:\projects\codex-image-router\src\diagnostics\diagnostics.ts`
- Create: `D:\projects\codex-image-router\tests\diagnostics.test.ts`
- Modify: `D:\projects\codex-image-router\src\http\server.ts`
- Modify: `D:\projects\codex-image-router\tests\httpServer.test.ts`

- [ ] **Step 1: Write failing diagnostics tests**

Verify diagnostics returns checks for:

1. Config readability.
2. Route count.
3. Default text route.
4. Default image route.
5. cc-switch provider count.
6. Windows/system proxy if available or safe fallback if unavailable.

- [ ] **Step 2: Run failure**

Run:

```powershell
npm test -- tests/diagnostics.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement diagnostics**

Expose:

```ts
export type DiagnosticCheck = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  message: string;
};

export async function collectDiagnostics(args: {
  store: ConfigStore;
  ccswitchRoot?: string;
  port?: number;
}): Promise<DiagnosticsReport>;
```

- [ ] **Step 4: Add HTTP endpoints**

Add:

```text
GET /api/diagnostics
GET /api/history
POST /api/history/clear
GET /api/docs/getting-started
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm test -- tests/diagnostics.test.ts tests/httpServer.test.ts
```

Expected: all pass.

---

### Task 4: Polished sync-ai control panel UI

**Files:**
- Replace: `D:\projects\codex-image-router\src\http\static\index.html`

- [ ] **Step 1: Rewrite UI**

Implement a polished dashboard with:

1. Top hero/status rail.
2. Sidebar navigation.
3. Overview cards.
4. First-run checklist.
5. Capability map.
6. Route editor.
7. cc-switch provider list.
8. History table.
9. Diagnostics report.
10. User guide panel.

- [ ] **Step 2: Connect to APIs**

Use existing and new endpoints:

```js
GET /api/config
PUT /api/config
GET /api/ccswitch/providers
POST /api/config/sync-ccswitch
GET /api/diagnostics
GET /api/history
POST /api/history/clear
GET /api/docs/getting-started
```

- [ ] **Step 3: Build and browser test**

Run:

```powershell
npm run build
```

Then open:

```text
http://127.0.0.1:8756/
```

Expected: page displays sync-ai UI and no console-breaking errors.

---

### Task 5: User documentation

**Files:**
- Create: `D:\projects\codex-image-router\README.md`
- Create: `D:\projects\codex-image-router\docs\user-guide\01-getting-started.md`
- Create: `D:\projects\codex-image-router\docs\user-guide\02-installation.md`
- Create: `D:\projects\codex-image-router\docs\user-guide\03-troubleshooting.md`
- Create: `D:\projects\codex-image-router\docs\user-guide\04-github-release-guide.md`
- Modify: `D:\projects\codex-image-router\docs\development\03-feature-changelog.md`
- Modify: `D:\projects\codex-image-router\docs\development\10-current-status.md`

- [ ] **Step 1: Write README**

README must explain what sync-ai is, who it is for, quick start, architecture, commands, security model, and current limitations.

- [ ] **Step 2: Write user guides**

Guides must cover install/start/sync/use/troubleshoot/GitHub release steps.

- [ ] **Step 3: Update changelog and status**

Record Phase 1.5 changes and remaining Phase 2 items.

---

### Task 6: Verification and GitHub preparation

**Files:**
- Modify if needed: `.gitignore`
- Check all files

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm test
npm run build
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py D:\projects\codex-image-router
```

Expected: all pass.

- [ ] **Step 2: Refresh plugin cachebuster**

Run:

```powershell
python C:\Users\zhuzhenyu\.codex\skills\.system\plugin-creator\scripts\update_plugin_cachebuster.py D:\projects\codex-image-router
```

- [ ] **Step 3: Reinstall plugin locally**

Run:

```powershell
& "C:\Users\zhuzhenyu\AppData\Local\OpenAI\Codex\bin\38dff8711e296435\codex.exe" plugin add "sync-ai@zno-local" --json
```

If marketplace still references old name, update marketplace entry before reinstalling.

- [ ] **Step 4: Prepare GitHub**

Initialize/rename remote repository to `sync-ai` and push. If authentication is missing, stop and tell the user exactly what command to run or what credential is required.

