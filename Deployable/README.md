# Deployable

Local, state-driven execution node for Meander. The deployable registers with the State Server, runs local show logic, and executes media actions against local hardware only.

## Quick start (offline)

```
go run .\cmd\deployable\ --offline --playback-backend vlc --diagnostic-showlogic
```

Then open `http://localhost:8090/api/status`.

## Configuration

All settings are available as flags or environment variables.

- `--server` / `DEPLOYABLE_SERVER_URL` (default: `ws://localhost:8081/ws/deployable`) - State server WebSocket URL
- `--data-dir` / `DEPLOYABLE_DATA_DIR` (default: `./data`)
- `--assets-dir` / `DEPLOYABLE_ASSETS_DIR` (default: `./Assets`)
- `--assets-source-dir` / `DEPLOYABLE_ASSETS_SOURCE_DIR`
- `--assets-source-url` / `DEPLOYABLE_ASSETS_SOURCE_URL`
- `--assets-cleanup` / `DEPLOYABLE_ASSETS_CLEANUP` (default: `false`)
- `--web` / `DEPLOYABLE_WEB_ADDR` (default: `:8090`)
- `--version` / `DEPLOYABLE_VERSION` (default: `dev`)
- `--offline` / `DEPLOYABLE_OFFLINE` (default: `false`)
- `--diagnostic-showlogic` / `DEPLOYABLE_DIAGNOSTIC_SHOWLOGIC` (default: `false`)
- `--playback-backend` / `DEPLOYABLE_PLAYBACK_BACKEND` (default: `vlc`) - Options: `vlc`, `libvlc`, or `stub`
- `--vlc-path` / `DEPLOYABLE_VLC_PATH` (default: `vlc`) - Path to VLC executable (for `vlc` backend)
- `--vlc-debug` / `DEPLOYABLE_VLC_DEBUG` (default: `false`) - Enable VLC stderr logging for RC debugging

## VLC media engine

The default playback backend launches VLC as a background process and controls it via the RC interface (no cgo required).

Recommended on Windows:

```
go run .\cmd\deployable\ --offline --playback-backend vlc --vlc-path "C:\Program Files\VideoLAN\VLC\cvlc.exe"
```

Notes:
- Video outputs are targeted using `display-0`, `display-1`, etc.
- Audio outputs are targeted using `audio-0`, `audio-1`, etc.
- Targets are resolved from discovered capabilities and can also be referenced by device name.
- For diagnostics, place test files in `Assets/` and use `--diagnostic-showlogic`.

## Asset sync

The deployable can fetch missing assets from:
- `DEPLOYABLE_ASSETS_SOURCE_DIR` (local directory)
- `DEPLOYABLE_ASSETS_SOURCE_URL` (HTTP, e.g. `http://server:8081/assets`)

If neither is specified, the deployable will automatically derive the assets URL from the server WebSocket URL (e.g., `ws://localhost:8081/ws/deployable` → `http://localhost:8081/assets`).

`DEPLOYABLE_ASSETS_CLEANUP=false` is recommended during testing to avoid deleting files that are not referenced by the current show logic.

## Registration flow

1. Boot loads or creates `data/device.json` and loads any saved assignment in `data/assignment.json`.
2. Hardware capabilities are discovered and cached for the session.
3. If no role is assigned, a pairing code is generated.
4. The deployable connects to the State Server and sends a `hello` containing device identity, pairing code (if unassigned), current profile/show logic versions, and capabilities.
5. The server assigns a role, profile, and show logic via `assign_role`.
6. The deployable validates the execution profile and show logic, verifies required assets, downloads missing assets, and optionally cleans up unreferenced assets.
7. Assignment data and versions are persisted to disk and acknowledged with `assign_role_ack`.
8. The deployable subscribes to global state updates and begins execution.

## State updates and action execution

1. The State Server sends `state_update` messages containing the active global state and a monotonically increasing version.
2. The deployable applies state updates only if the version increases.
3. The show logic engine performs an exit/enter transition when the state changes and emits actions.
4. Actions are dispatched asynchronously to the playback engine or other executors.
5. Playback executors resolve the target output and invoke the media backend.

