# Dekaf end-to-end tests

An all-JVM e2e suite for the Dekaf UI: **Scala 3 + Playwright for Java + ScalaTest**, driving the
real UI against a real Apache Pulsar. Every mutation is cross-checked through the **PulsarAdmin**
REST client (the oracle); test data is produced with the **PulsarClient**. No mocks.

- **Catalog:** the specs *are* the catalog - grouped by page/feature under `test/scala/` (see §5
  Layout); each `test("…")` name describes the interaction it covers.
- **Priority features** (deepest coverage): the **Library** (`features/library/`) and the
  **Consumer Session** (`features/consumersession/`).
- **Known gaps** the suite doesn't yet cover are in §6.

---

## 1. Prerequisites

You need `sbt`, a JDK (21), `node`+`npm` (to build the UI bundle the server serves), Docker (for the
Pulsar standalone), and the per-arch `envoy.bin` shipped in `bin/`. If the repo uses Nix, everything
except Docker is provided by the dev shell - prefix any command with `nix develop --command …`, e.g.
`nix develop --command bash -c 'cd e2e && sbt test'`.

---

## 2. Bring up the local stack (once)

```bash
# 1) Pulsar standalone in Docker  (admin :18080, broker :6650)
e2e/scripts/stack-up.sh

# 2) Build the UI + run the Dekaf server on :8090, pointed at that Pulsar
e2e/scripts/run-dekaf.sh          # leave running in its own terminal
```

Tear the Pulsar container down with `e2e/scripts/stack-down.sh`. For a full multi-broker / multi-bookie
shape instead of standalone, use `e2e/scripts/stack-up-cluster.sh` (Helm on k3d).

The suite talks to these via three env vars (defaults shown, and they already match `stack-up.sh`).
Load them with `set -a; source e2e/.env.example; set +a` (the `set -a` is what exports them to the JVM):

| Var | Default | What |
|---|---|---|
| `DEKAF_BASE_URL` | `http://localhost:8090` | the Dekaf UI under test |
| `PULSAR_ADMIN_URL` | `http://localhost:18080` | PulsarAdmin oracle (matches `stack-up.sh`; host `:8080` is often taken) |
| `PULSAR_SERVICE_URL` | `pulsar://localhost:6650` | PulsarClient producer |

> **After editing anything under `ui/`, rebuild the bundle** so the running server serves it:
> `nix develop --command bash -c 'cd ui && node ./build.js'` (fast, ~1s; skips the full `tsc`).

---

## 3. Run the tests

```bash
cd e2e
export PULSAR_ADMIN_URL=http://localhost:18080 \
       PULSAR_SERVICE_URL=pulsar://localhost:6650 \
       DEKAF_BASE_URL=http://localhost:8090

sbt test                                              # the green lane (KnownBug excluded by default → passes)

sbt "testOnly features.consumersession.*"             # one feature area
sbt "testOnly features.library.*"                     # the Library feature
sbt "testOnly routes.NavigationTreeSpec"              # one spec
sbt "testOnly *CsFiltersSpec -- -z CS-10"             # a single test by name substring (-z)
```

### The `KnownBug` mechanism (lane currently EMPTY - all bugs fixed 2026-07-19)

While an app bug is open, its regression test asserts the **correct** behavior, is tagged `KnownBug`,
and stays **red on purpose** - excluded from `sbt test` (`Test / test / testOptions` in `build.sbt`)
so the normal run is green. When the bug is fixed, the test is **untagged** and joins the green lane
as an ordinary regression. All 19 catalogued bugs were fixed on 2026-07-19, so the
`knownbugs/*Spec` tests now run green in the normal lane (6 remain `ignore`d - fixed app-side but not
driveable from this harness; rationale inline, and see §6). The tag + exclusion stay wired for the next bug:

```bash
sbt "testOnly * -- -n KnownBug"        # the bug lane - currently runs nothing (no open bugs)
sbt test                               # green lane, includes the fixed-bug regressions
```

Tests run **serially** (`Test / parallelExecution := false`) against one shared stack; isolation is by
a fresh-UUID `context_id`/tenant per test (auto-torn-down), so many suites are safe to interleave.

---

## 4. Debug & observe each test in a UI  ← "playwright dashboard mode"

Playwright for Java has **no Node-style `--ui` mode**, but the harness wires up the tools that
together give the same "play and observe each test separately" experience. All are driven by env vars
read in `harness/Config.scala`.

A **Trace** is a full recording of one test: an action-by-action timeline with a DOM snapshot at every
step, plus the network, console, and source. **Traces are only recorded for FAILING tests by default**
(`TRACE=retain-on-failure`) - to review *every* test, record with `TRACE=on`. Note `sbt test` excludes the
KnownBug lane, so use `testOnly *` to record **all** tests (green lane + KnownBug) in one pass:

```bash
TRACE=on sbt "testOnly *"                # every test → target/traces/<STATUS>__<Suite>__<test>.zip
```

Each trace is stamped with the test's outcome - `PASS` / `FAIL` / `BUG` (a `KnownBug` test that failed as
designed) / `SKIP` (canceled) - right in the filename (see `DekafSuite.stopTracing`), and a re-run replaces a
test's prior trace rather than leaving a stale duplicate.

### 4a. Trace dashboard - browse & pick any test (the closest thing to `--ui`)

```bash
sbt "runMain harness.TraceDashboard"     # clickable index of every recorded test → opens the browser
```

Serves everything from **one** local http origin (**:9500**, override with `TRACE_PORT`): a grouped-by-spec
index at `/dashboard`, and the bundled Playwright trace viewer at `/`. Rows are **colorized by outcome**
(green passed · red failed · amber known-bug · grey skipped) with **filter chips** (`All / Failed / Known bug /
Passed / Skipped`) to isolate, say, just the failures. Click any test to open its **own** full trace (timeline ·
DOM snapshots · network · console) via `/?trace=…`. Single-origin is what makes it work - the viewer's service
worker (which renders the DOM snapshots) needs scope `/`, and plain-http loopback avoids the HTTPS→HTTP
mixed-content block you hit pointing the hosted `trace.playwright.dev` at a local trace. **Fully local, no
internet.** Ctrl-C stops it.

### 4b. Trace Viewer - one test, or all merged

```bash
sbt "runMain harness.ShowTrace target/traces/*CS-10*.zip"   # one test (glob expanded by ShowTrace)
sbt "runMain harness.ShowTrace"          # all recorded traces, merged into one timeline (no picker)
```

Trace filenames are `<STATUS>__<Suite>__<test>.zip` (STATUS ∈ PASS/FAIL/BUG/SKIP - stamped from the
test outcome), so a bare-suite glob needs the leading `*`. The quoted sbt command shields `*` from
your shell; ShowTrace expands it itself. Also fully offline (bundled viewer on :9323).

### 4c. Headed mode - watch the browser live

```bash
HEADED=true sbt "testOnly routes.NavigationTreeSpec"     # see the real browser drive the UI
HEADED=true SLOWMO=800 sbt "testOnly ..."                # + slow each action to 800ms so you can follow
```

### 4d. Playwright Inspector - step through & pick locators

```bash
PWDEBUG=1 sbt "testOnly *CsFiltersSpec -- -z CS-10"
```

`PWDEBUG=1` opens the **Playwright Inspector**: the run pauses, and you step action-by-action, watch
each locator highlight in the page, and try selectors live. (It also forces headed mode.)

### 4e. Codegen - record interactions into selectors/code

```bash
sbt "runMain harness.Codegen http://localhost:8090"
```

Click around the app; Playwright writes the matching locators/actions you can paste into a spec.

### 4f. Individual tests from the IDE

Import the `e2e` sbt project into IntelliJ (or VS Code + Metals); each `test("…")` gets a gutter
run/debug icon, so you can run and observe one test at a time with breakpoints.

---

## 5. Layout

```
e2e/src
├── main/scala
│   ├── harness/        Config, PwRuntime (shared Playwright+Browser), PulsarFixtures (admin oracle +
│   │                   producer + per-test teardown), Eventually (poll the oracle, no fixed sleeps),
│   │                   Cli (ShowTrace / Codegen mains)
│   ├── ui/             reusable component objects (ConfirmationDialog, SubscriptionOverviewPage, …)
│   └── features/       component objects for the priority features
│       ├── library/            LibrarySidebar, LibrarySaveDialog, LibraryBrowser
│       └── consumersession/    ConsumerSessionPage, FilterPanel, TargetSelector, ExportModal, ToolsPanel
└── test/scala
    ├── harness/        DekafSuite (base trait: fresh BrowserContext + trace + fixtures per test)
    ├── smoke/  routes/ instance/   navigation, chrome, and per-page specs
    ├── primitives/     cross-cutting form primitives (X-1/2/3)
    ├── features/       library/ + consumersession/ + producer/ specs
    └── knownbugs/      the KnownBug-tagged regressions (§6)
```

**Instrumentation** is additive only: UI components take an optional `testId` prop rendered to
`data-testid` (never any behavior change), selected in tests with `page.getByTestId(...)`.

---

## 6. Known gaps & follow-ups

Honest backlog - none block the green lane; each is a place the suite proves less than it might.

**Infrastructure**
- **Playwright browsers aren't pinned/cached** - a clean CI runner downloads Chromium on first use
  (the CI `e2e` job installs it each run).
- **Library state accumulates.** `run-dekaf.sh` doesn't set `DEKAF_DATA_DIR`, so items land in
  `server/data/library` and survive runs. Tests are context-scoped so they still pass, but
  instance-scoped items (e.g. LIB-16's note) leak and counts drift. Isolating the data dir also needs
  `js/dist/libs.js` + `proto/` seeded into it (see `run-dekaf.sh`).
- **No independent Library oracle.** LIB CRUD arranges *and* verifies through the same UI path, so a
  shared serialization/render defect could pass both. A generated `LibraryService` gRPC stub would fix
  this (and let the `ignore`d BUG-8/9/17 regressions drive the server directly).

**Assertions thinner than the feature they name** (acknowledged, not defects)
- **CS-16/17** don't assert the full counter/state machine incl. broker-side consumer presence;
  **CS-23** asserts the details panel opens, not its tab contents; **CS-28** asserts formats + `.zip`
  entry indices, not exact exported values.
- **TOP-3/4, SUB-3** assert success toasts rather than a polled state change; **RES-2** supplies a
  missing id, not a malformed persisted config; **LIB-18** proves the `?id=` URL loads, not that the
  exact saved config restored.
- **Read-only stat views** (INS-9/10 · TOP-11/12 · SUB-7) are render-smoke - the anchor renders with no
  crash; they don't assert specific stat values.
- **Catalog breadth** is narrower than some pages: e.g. TEN-1 omits cluster add/remove; NS-8 runs
  split + clear-backlog but not unload/unload-all; TOP-7 doesn't verify Earliest/Latest cursor
  semantics; Producer properties/event-time have testIds but no dedicated test yet.

**Open product/config questions** (not test gaps)
- **SUB-6**: Delete-Subscription's guard is the **topic FQN**, not the subscription name - the test
  encodes today's behavior; confirm it's intended.
- The optional cluster profile (`stack-up-cluster.sh` / `values-test.yaml`) pins a chart declaring
  Pulsar 2.10.2 while overriding the image to 3.2.1 - template-validated only, never deployed. Align
  versions before relying on it.

**Regression coverage - the `KnownBug` lane** (catalogued bugs fixed; see §3). Twelve
run green as ordinary regressions in `knownbugs/*Spec` (BUG-1,3,4,5,6,10,12,13,14,15,18 +
BUG-19→NAV-14). Six are fixed app-side but not driveable from Playwright and stay `ignore`d with inline
rationale - covered instead by **jest** component tests (BUG-2/7: `KeyValueEditor` /
`AvailableInContextsButton`) and **server** unit tests (BUG-8/9/17: `LibraryBugRegressionsTest`).
**Two were reclassified as intended design** after owner review: **BUG-11** - auto-refresh is
deliberately ONE global toggle ("we either want to refresh any table, or not"); a `MoreKnownBugsSpec`
test now pins the global-shared semantics. **BUG-16** - per-connection library-storage scoping was
reverted: a Dekaf instance always serves one Pulsar, so isolation lives at the deployment layer
(the desktop app gives each saved connection its own `DEKAF_DATA_DIR`; docker runs one dekaf per
pulsar). The library dir stays flat; the path-traversal guard (BUG-17) is unaffected.
