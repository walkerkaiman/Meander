# MEANDER – Conductor Design Document (Revised)

## 1. Purpose
The **Conductor** application orchestrates runtime execution of a MEANDER show package exported from the Editor.

Responsibilities:
1. Load and validate a **show package** (`assets/`, `config/`, `exports/`).
2. Render an interactive node-based flow graph so the operator can visualise and control progress.
3. Sequence through **Scene** and **Fork** nodes either **manually** (button) or **automatically** (vote countdown expiry).
4. Receive votes from audience devices, compute winners and advance accordingly.
5. Broadcast OSC messages for every state change to external systems (audio, projection, lighting).
6. Serve media (full-screen, no UI) and voting UI to the connected audience devices.

Everything is implemented in **TypeScript** end-to-end to guarantee strict type safety.

---

## 2. High-Level Architecture
```mermaid
flowchart TD
    subgraph Browser (Conductor UI)
        A[React App]
        A -->|GraphQL (query) / REST (mutation)| S(Server API)
        A --> WS((WebSocket))
    end
    subgraph Node.js Server (single process)
        direction TB
        S -.->|internal events| EVT[Event Bus]
        S --> V[Validator]
        S --> DB[(LevelDB Snapshot)]
        S --> OSC[OSC Publisher]
        S --> AUD[Audience Service]
        AUD --> Vote[Vote Aggregator]
        AUD --> Media[Media Router]
        EVT --> SEQ[Sequencer]
    end
    OSC -->|UDP| External[Audio/Projection/Lighting]
    Audience[(Phones)] -- HTTP / WS --> AUD
```
Key notes:
* **Event Bus** (`eventemitter3`) decouples modules for testability & crash-isolation.
* **LevelDB Snapshot** persists current state & vote history, enabling crash recovery.
* **Local-Network Operation**: The Conductor computer acts as a LAN hub – all services bind to **0.0.0.0** so phones/tablets on the same Wi-Fi/Ethernet can reach HTTP, WebSocket and UDP OSC ports. No public-internet exposure assumed.

---

## 3. Technology Stack
| Layer      | Library / Tool                                   | Notes |
|------------|---------------------------------------------------|-------|
| Runtime    | Node.js ≥ 18, TypeScript (strict)                 | |
| Back-end   | `express`, `ws`, `osc-js`, `eventemitter3`, `level`, `helmet`, `zod` | `osc-js` chosen for maintenance; LevelDB for fast local persistence |
| Front-end  | `React 18`, `Vite`, `zustand`, `react-flow`, `mantine`, `swr` | `swr` for cached REST queries |
| Build      | `pnpm` workspace, `tsup` (server), `vite` (client) | |
| Quality    | `eslint`, `prettier`, `husky`, `lint-staged`      | Pre-commit guard-rails |
| Testing    | `vitest`, `react-testing-library`, `supertest`    | + manual OSC listener tests |

---

## 4. Data Models (TypeScript)
```ts
// core types reused from Editor
import { SceneNode, ForkNode, ShowPackage } from "@meander/types";

// runtime additions
interface ActiveState {
  id: string;
  type: "scene" | "fork";
}

interface VotePayload {
  showId: string;
  forkId: string;
  choiceIndex: 0 | 1;
  deviceId: string; // session cookie
}

interface VoteResult {
  forkId: string;
  counts: [number, number];
  winnerIndex: 0 | 1;
}
```
All runtime types live in `@meander/conductor-types` and are imported on both server & client.

---

## 5. Show Package Loading & Validation Flow
1. Operator selects **File → Load Show** and picks a folder or `.zip`.
2. UI zips files and streams them to the server (WebSocket, 64 kB chunks).
3. Server saves into `/tmp/<uuid>` and calls `validator.validate()`.
4. **On success** → initial sequencer state is snapshotted to LevelDB, `showLoaded` is broadcast.
5. **On failure** → `validationError` events stream back; UI highlights offending nodes. The previous snapshot is left intact so a running show cannot be overwritten by a bad package.

Recent shows: paths cached in `~/.meander/conductor.json` and offered on startup.

---

## 6. Sequencer Logic
```ts
// pseudo-code powered by internal Event Bus
let current = show.metadata.initialStateId;

function advance(nextId: string) {
  if (!show.nodes[nextId]) throw new Error("Unknown state");
  current = nextId;
  persistSnapshot(current);          // LevelDB put
  oscPublisher.stateChanged(current);// UDP
  wsHub.broadcast("stateChanged", { id: current });
}

// manual operator click
ui.on("advance", () => {
  const nextId = computeNext(current);
  advance(nextId);
});
```
Safeguards:
* Transitions debounced (300 ms) to avoid double-clicks.
* Unknown or missing connections pause sequencer until operator override.

Edge cases:
* **Tie votes** → default to choice index 0.
* **Manual Jump** → operator can click any node and trigger `advance`.

---

## 7. Audience Service (Hardening)
* **Endpoints**
  * `GET /audience/show` — JSON of current state, 1 s HTTP cache.
  * `POST /audience/vote` — body validated by zod, rate-limited **6 req / 10 s / IP**. Same `deviceId` may overwrite its previous choice (idempotent).
  * `GET /media/:asset` — `Cache-Control: public,max-age=31536000,immutable`.
* **WebSocket Back-pressure** — messages are dropped if client queue > 4 MB.

---

## 8. OSC Broadcasting
1. UDP port configurable (`OSC_PORT`, default 57121).
2. On transition to **Scene** → `/scene/<slug>`.
3. On transition to **Fork** → `/fork/<slug>`.
4. Scene `outputIds` are relayed verbatim after the above.
5. Heartbeat every 5 s: `/meander/heartbeat`.

---

## 9. User Interface Specification (React)
```
┌─────────┬──────────────────────────────────────────┐
│ Progress│            Node Flow Canvas             │
│ Sidebar │         (react-flow viewport)            │
│         │                                          │
└─────────┴──────────────────────────────────────────┘
                ▼
        ┌────────────────────────┐
        │  Advance / Jump Area  │
        │ [◀ Prev] [Advance ▶]  │
        └────────────────────────┘
```
* **Progress Sidebar** — chronological history + upcoming node.
* **Node Flow Canvas** — pan / zoom; current node highlighted.
* **Control Bar** — large **Advance**; disabled during vote countdown.
* **MenuBar** — `File → Load Show`, `Recent`, `About`.

Accessibility: keyboard-navigable, high-contrast mode, respects `prefers-reduced-motion`, colour-blind safe palette. Designed for 1920 × 1080 minimum.

---

## 10. Validation Rules (reuse from Editor)
* Exactly two choices per Fork.
* Connections must reference existing node IDs.
* No orphan nodes unless intentionally unreachable (warning).
* Assets referenced in nodes must exist in `/assets`.
* `outputIds` must map to entries in `outputs.json`.

---

## 11. Error Handling & Logging
* **Pino** rotating logs `logs/YYYY-MM-DD.log` (server).
* Front-end toasts for recoverable issues; modal for blocking errors.
* Global safeguards
  ```ts
  process.on("unhandledRejection", err => { log.fatal(err); shutdownSafe(); });
  process.on("uncaughtException",  err => { log.fatal(err); shutdownSafe(); });
  ```
* Client errors collected via Sentry (or window.onerror fallback).

---

## 12. Deployment & Ops
| Concern   | Detail |
|-----------|--------|
| Container | Multi-stage `Dockerfile` → `node:18-slim` runtime |
| Ports     | `SERVER_PORT` 4000 (default), `OSC_PORT` 57121 – **all bound to 0.0.0.0** |
| Network   | Operates entirely on local network; ensure firewall allows inbound TCP 4000 and UDP 57121 |
| Config    | `.env`; schema validated by zod at boot |
| Health    | `GET /healthz` returns 200 & sequencer state (used by k8s/systemd) |
| Shutdown  | Graceful: stop accepting votes, flush LevelDB, close UDP sockets |

---

## 13. Security Checklist
* `helmet` HTTP headers.
* CORS restricted to operator domain.
* Rate-limit audience routes (express-rate-limit).
* CSRF token on vote `POST`.
* Content-Security-Policy: `default-src 'self'`; `connect-src 'self' ws:`.
* Vote deviceId stored in signed cookie; HTTP-only, SameSite=Lax.

---

## 14. Directory Structure (Monorepo)
```
packages/
  editor-validator/     # existing package from Editor
  conductor-types/
  conductor-server/
  conductor-client/
```

---

## 15. Definition of Done
1. Loads & validates any Editor-exported show without errors.
2. Operator can fully run a show (manual & vote-driven) on local network.
3. OSC packets verified via external listener.
4. All packages build with `tsc --noEmit`, `eslint` and unit tests pass.
5. 90 % unit test coverage of sequencer, validator integration & vote tally.
6. Crash recovery acceptance test (see §16) passes.

---

## 16. Acceptance Tests
1. **Load Show** — given valid package, graph renders, **Advance** enabled.
2. **Manual Advance** — clicking button highlights next node, OSC `scene/…` sent.
3. **Fork Voting** — two phones vote, countdown 0, winner path animates, OSC `fork/…` sent, next Scene media pushes.
4. **Invalid Package** — missing asset triggers blocking modal with error list.
5. **Crash Recovery** — kill server mid-show, restart → resumes at last state.
6. **Vote Flood** — 10 000 mock devices vote concurrently; server stays <200 ms p95.

---

## 17. API Contracts (Machine-Readable)

All HTTP and WebSocket contracts are defined in `/packages/conductor-server/openapi.yaml` (REST) and `/packages/conductor-server/asyncapi.yaml` (WebSocket).  These YAML files are the **single source of truth**; server TypeScript types are code-generated via `openapi-typescript` and `@asyncapi/generator` to guarantee parity.

### REST (OpenAPI extract)
* `GET /audience/show` → `200 ShowState` or `503 ServiceUnavailableError`
* `POST /audience/vote` → `202 Accepted` or `400 ValidationError`
* `GET /healthz` → `200 { status: "ok" }`

### WebSocket (AsyncAPI channels)
* `stateChanged` — `{ id: string; type: "scene" | "fork" }`
* `validationError` — `ValidationError[]`

The full schemas, including error payloads, can be generated locally:
```bash
pnpm --filter conductor-server run build:schemas
```

---

## 18. Environment Variables
| Var                 | Default        | Description |
|---------------------|----------------|-------------|
| `SERVER_PORT`       | `4000`         | HTTP & WS listener (binds `0.0.0.0`) |
| `OSC_PORT`          | `57121`        | UDP OSC broadcast port |
| `DATA_DIR`          | `~/.meander`   | Root for LevelDB & logs |
| `LOG_LEVEL`         | `info`         | pino log level |
| `RATE_LIMIT_WINDOW` | `10`           | seconds |
| `RATE_LIMIT_MAX`    | `6`            | votes per window per IP |

`.env.example` is committed for reference; CI loads variables via `.env.ci`.

---

## 19. File & Folder Conventions
```
~/.meander/
  conductor/
    db/               # LevelDB (one store per showId)
    logs/YYYY-MM-DD.log
    snapshots/        # zipped backups every transition
```
Temporary uploads go to `os.tmpdir()/meander/<uuid>` and are deleted after validation.

---

## 20. Build & Scripts
Monorepo root `package.json` exposes convenience scripts:
| Script                   | Action |
|--------------------------|--------|
| `pnpm dev`               | Concurrent dev for server & client with hot-reload |
| `pnpm build`             | Full production build (client + server bundles) |
| `pnpm test`              | Run unit + integration tests |
| `pnpm lint`              | `eslint` + `prettier --check` |
| `pnpm start`             | Start compiled server (`dist/server/index.js`) |

CI (GitHub Actions) uses the same commands; failing lint or tests blocks merge.

---

## 21. Error Taxonomy
| Code | HTTP Status | Meaning | Recoverable |
|------|-------------|---------|-------------|
| `ERR_VALIDATION`      | 400 | Show package failed schema validation | Yes |
| `ERR_VOTE_RATE`       | 429 | Vote rate-limit exceeded              | Yes |
| `ERR_SHOW_NOT_FOUND`  | 404 | Requested showId unknown              | Yes |
| `ERR_INTERNAL`        | 500 | Unhandled server error                | No  |
| `ERR_SEQUENCE_STALLED`| 503 | Sequencer missing next state          | Operator fix |

Errors are serialised `{ code, message, details? }` and documented in OpenAPI.

---

## 22. Performance Budgets
| Metric                      | Target |
|-----------------------------|--------|
| Server start-up time        | < 2 s |
| p95 vote POST latency       | < 50 ms @ 2k concurrent devices |
| WebSocket broadcast fan-out | 10k msgs/s sustained |
| Memory footprint            | < 300 MB RSS |
| CPU usage                   | < 70 % of one core normal load |

Budgets are enforced in CI via `k6` load test matrix.

---

## 23. Test Fixtures
* `fixtures/sample-show.zip` — happy-path package used in unit & e2e tests.
* `scripts/generate-votes.ts` — synthetic vote stormer (configurable concurrency).
* `osc-listener.js` — Node UDP listener validating OSC payload shape during tests.

All fixtures live under `/packages/conductor-server/__tests__/fixtures`.

---

## 24. Definition of “AI-Ready”
The presence of machine-readable OpenAPI & AsyncAPI specs, deterministic scripts, exhaustive error codes and fixtures allows autonomous agents to scaffold or regenerate fully-type-safe server & client code without human intervention.
