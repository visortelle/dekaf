# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, Cursor, etc.) when working with code in this repository.

## What this is

Dekaf is an open-source UI for Apache Pulsar. It's a single deployable binary that bundles:
- A **React + TypeScript** frontend (`ui/`)
- A **Scala 3 / ZIO** backend exposing a gRPC API (`server/`)
- An embedded **Envoy proxy** that translates browser gRPC-Web ↔ native gRPC

The UI and server communicate over **Protobuf / gRPC-Web**. Proto definitions live in `proto/` and are the source of truth for the API contract — generated code is committed into `ui/grpc-web/` and `server/src/main/scala/pb/`.

## Development environment

Tooling (JVM, Node, protoc, buf, sbt, envoy) is managed by **Nix** — you don't install these separately.

- `make dev` at the repo root drops you into the Nix dev shell (`nix develop`).
- Local Pulsar for development: `cd devenv && make dev-local` (runs Pulsar standalone in Docker; **note: this wipes all local Docker containers and volumes**).

Typical dev loop (each in its own terminal, inside the Nix shell):
1. `cd proto && make build` — regenerate Protobuf/gRPC code (run after any `.proto` change).
2. `cd server && sbt` then `run` (or `make dev` = `sbt ~reStart` for hot reload).
3. `cd ui && make dev` — esbuild watch mode; output goes into `server/src/main/resources/ui/static/dist`.

## Common commands

### Build everything
- `make build` — builds proto, ui, server, and runs server tests (full release build).

### Server (`server/`, Scala 3 + sbt)
- `sbt run` — run the server.
- `make dev` — `sbt ~reStart` (hot reload on file changes).
- `make test` / `sbt test` — run all tests (ZIO Test).
- Run a single test suite: `sbt "testOnly *SuiteName*"`.
- `make build` — produces a packaged tarball (`universal:packageZipTarball`).

### UI (`ui/`, TypeScript + React + esbuild)
- `npm run dev` (or `make dev`) — watch build (dev).
- `npm run build` — type-check (`tsc --noEmit`) then bundle.
- `npm run check-ts` — type-check only.
- `npm run test` / `make test` — Jest.
- Run a single test: `npx jest path/to/file.test.ts` or `npx jest -t "test name"`.
- Formatting is via **Rome** (`rome.json`); linter is disabled, formatter uses 2-space indent / 140 col.

### Proto (`proto/`)
- `make build` — `buf generate` regenerating code into `ui/grpc-web/`, `server/src/main/scala/pb/`, and `demoapp/`.
- `make clean` — removes all generated output.

### E2E (`e2e/`)
- Separate sbt project using Playwright + Testcontainers (ZIO Test). `sbt test`.

## Architecture

### Request flow
Browser → Envoy (gRPC-Web → gRPC) → gRPC server → Pulsar broker. The Scala backend talks to Pulsar over both the **admin API (web URL, :8080)** and the **client service (broker URL, :6650)**. `Main.scala` races three long-running fibers — `Envoy.run`, `HttpServer.run` (Javalin, serves the static UI + misc HTTP), and `GrpcServer.run` (the main API). See `ARCHITECTURE.md` for the sequence diagram.

### Backend module pattern
Each Pulsar domain has its own package under `server/src/main/scala/` (e.g. `tenant`, `namespace`, `topic`, `topic_policies`, `consumer`, `producer`, `schema`, `brokers`, `clusters`, `metrics`, `library`). The convention is a `XxxServiceImpl.scala` that implements the gRPC service generated from the matching `proto/.../v1/*.proto`. All services are wired together in `server/src/main/scala/server/grpc/GrpcServer.scala`. Configuration is centralized in `server/src/main/scala/config/` (ZIO Config; reads `config.yaml` and `DEKAF_`-prefixed env vars — see `docs/configuration-reference.md`).

### Consumer (message browsing) — the most complex feature
`server/src/main/scala/consumer/` implements savable, reusable browse sessions: message filtering, coloring rules, value projections, deserializers, and start-from logic. User-supplied JavaScript (for filters/projections) is evaluated via **GraalVM JS** (the `org.graalvm.js` / truffle deps in `build.sbt`).

### Persistence / Library
Dekaf stores saved sessions and other user artifacts as "managed items" on disk under `dataDir` (`config`: `dataDir`, default `./data`). The `library/` package and `persistency/` handle this; there is no external database.

### Frontend structure
`ui/components/` is organized by page (`TenantPage`, `NamespacePage`, `TopicPage`, `SubscriptionPage`, `InstancePage`) plus shared `ui/`, `app/` (router, contexts, hooks, auth), and `pulsar/`. The generated gRPC-Web client lives in `ui/grpc-web/`. Entry point is `ui/entrypoint.tsx`. Data fetching uses SWR (`swrKeys.ts`).

## Conventions & notes
- The backend is intentionally **straightforward Scala** — avoid heavy FP / type-level acrobatics (per `CONTRIBUTING.md`).
- After changing any `.proto`, you **must** run `cd proto && make build` and rebuild both sides; the generated code is committed.
- Generated directories (`ui/grpc-web/`, `server/src/main/scala/pb/`) should not be hand-edited.
- `demoapp/` is a sample producer app used by the quick-start docker-compose to populate demo data.
- `desktop/` contains an Electron wrapper; `helm/` and `deployment/` are for k8s; `docker/` holds image builds and the quick-start compose file.
- Git LFS is required (see `CONTRIBUTING.md` for the `.gitconfig` filter setup).
