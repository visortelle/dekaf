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

sbt "testOnly configuration.*"                        # the DEKAF_* configuration lane (§6)
```

The `configuration.*` specs are the one group that does **not** use the shared `:8090` stack: each
starts its own Dekaf with the `DEKAF_*` overrides it is about (see §6). They need Pulsar and the
staged server build, not `run-dekaf.sh`.

### The `KnownBug` mechanism (lane currently EMPTY)

While an app bug is open, its regression test asserts the **correct** behavior, is tagged `KnownBug`,
and stays **red on purpose** - excluded from `sbt test` (`Test / test / testOptions` in `build.sbt`)
so the normal run is green. When the bug is fixed, the test is **untagged** and joins the green lane
as an ordinary regression. All 19 originally catalogued bugs were fixed on 2026-07-19, so the
`knownbugs/*Spec` tests now run green in the normal lane. (`CsTopicKindsSpec` CS-TK-6 was untagged
on 2026-07-25 when both counting Start-From modes became GLOBAL - §6, "Start-From: batching, and
the entry-vs-message trap".)

The lane was last used on 2026-08-09, during the Guaranteed exact-replay alignment, and emptied
the same day: `CsDeliveryModesSpec` **CS-DM-R3B** caught the first-play boundary re-capture
clobbering a live-edge (Latest) boundary - fixed server-side (the first Play now consumes the
create-time boundaries) and untagged; `CsFlowControlSpec` **CS-FC-5**'s intermittent red turned
out to be an oracle defect in the TEST (the broker's dispatch counter counts dispatches and
resets with the consumer on a transient reconnect, so a redelivered held window read as
over-admission) - the oracle is now connection-epoch-bracketed, the server's admission
serialization got its own unit pins, and the cell is untagged. No test carries the tag today, so
the bug lane runs **0 tests** - that is the healthy state, not a broken filter. The named census
in `SuiteFactsSpec` FACTS-2 and the marker below must move together with any future tag.

Nothing in this suite is `ignore`d or `pending` either. The bugs that are fixed app-side but not
driveable from Playwright have no e2e test *at all* - they are covered in the jest / server tiers
instead (§6), with an inline pointer where they would have lived. (This paragraph used to claim six
`ignore`d tests; `rg '\bignore\s*\(' e2e/src/test` has found none for some time.)

Two topic-policy specs are the one exception, and an honest one: `TopicPolicySpec` (TOP-8/9) and
`TopicPolicyBreadthSpec` (TOP-13/14) `assume(...)` on the broker's `topicLevelPoliciesEnabled`
setting, so on any given stack the branch that does not match the broker RUNTIME-cancels - a canceled
test is neither a pass nor a failure. On the dev stack (policies ON) TOP-8 always cancels. That is
config-gated coverage rather than a hidden red test, so it is named here and pinned: the census below
counts every `assume(...)` and fails if one appears OUTSIDE those two specs, which is the one way the
same mechanism could quietly drop a test from the green run.

All of these are pinned by `harness.SuiteFactsSpec` against the marker below - the `ignored`,
`pending` and `known-bug` counts, the `assume` count and its location, and that build.sbt excludes
exactly the one `KnownBug` tag from `sbt test` (`excluded-tags`) - so none of the claims can drift
again.

<!-- suite-facts: ignored=0 pending=0 known-bug=0 assume=4 excluded-tags=1 -->

The tag and its exclusion stay wired for the next bug:

```bash
sbt "testOnly * -- -n KnownBug"        # the bug lane - red by design; currently empty (0 tests)
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
│   │                   DekafInstance (a short-lived Dekaf with DEKAF_* overrides - §6),
│   │                   Cli (ShowTrace / Codegen mains)
│   ├── ui/             reusable component objects (ConfirmationDialog, SubscriptionOverviewPage, …)
│   └── features/       component objects for the priority features
│       ├── library/            LibrarySidebar, LibrarySaveDialog, LibraryBrowser
│       └── consumersession/    ConsumerSessionPage, FilterPanel, TargetSelector, ExportModal, ToolsPanel,
│                               DeliveredMessages (the exact-set oracle - §6)
└── test/scala
    ├── harness/        DekafSuite (base trait: fresh BrowserContext + trace + fixtures per test),
    │                   BatchingFixtureSpec (the broker facts under Start-From), StackScriptsSpec
    │                   (scripts/), SuiteFactsSpec (this README's countable claims),
    │                   DeliveredMessagesSpec (the exact-set oracle really does beat a count - §6)
    ├── smoke/  routes/ instance/   navigation, chrome, and per-page specs
    ├── primitives/     cross-cutting form primitives (X-1/2/3)
    ├── features/       library/ + consumersession/ + producer/ specs
    ├── configuration/  the DEKAF_* properties, each on its own short-lived Dekaf (§6)
    └── knownbugs/      the KnownBug-tagged regressions (§6)
```

**Instrumentation** is additive only: UI components take an optional `testId` prop rendered to
`data-testid` (never any behavior change), selected in tests with `page.getByTestId(...)`.

---

## 6. Known gaps & follow-ups

Honest backlog - none block the green lane; each is a place the suite proves less than it might.

**Running the SERVER suite needs `bin/<os>/<arch>` on PATH.** Not an e2e matter, but it bites here
first: four `schema.protobufnative` tests and one `convertersTest` case shell out to `protoc.bin`,
which lives in the repo's per-arch `bin` dir. `run-dekaf.sh` exports it; a bare
`cd server && sbt test` does not, and the five fail with `Cannot run program "protoc.bin"` - which
reads exactly like a regression and is not one. Use
`export PATH="$PATH:$(node ../bin/get-bin-dir.js)"`.

**A table's `autoRefresh.intervalMs` below 2000ms is silently floored** (found 2026-08-09 while
root-causing CS-TP-5). SWR's default `dedupingInterval` is 2000ms, so a Table asking to poll every
1000ms - Topic Positions does - actually polls every ~2000ms. Measured, not inferred: request
counts sampled at 500ms landed the first refresh at ~2.5-3s and then every 2s. CS-TP-5 therefore
asserts the contract in its title (a visible tab keeps polling) with a tolerant window instead of
a fixed one; its old 2200ms wait expired just before the first refresh and failed deterministically.
Making the prop honest would double a deliberately broker-heavy panel's poll rate, so it is
recorded as an owner decision rather than changed.

**Infrastructure**
- **No independent Library oracle.** LIB CRUD arranges *and* verifies through the same UI path, so a
  shared serialization/render defect could pass both. A generated `LibraryService` gRPC stub would fix
  this - the one remaining piece of test infrastructure worth building. (One partial exception since
  2026-08-08: CFG-DD-1 reads the item's bytes back off disk, because it starts an instance whose
  `dataDir` the test itself owns. That is an oracle outside the UI, but only for "an item with this
  name was persisted here" - not for its contents.)

*Resolved:* Playwright browsers are no longer downloaded at all - they come pre-patched from the nix
store, version-locked to the Java client via the `nixpkgs-playwright` flake input, so a clean runner
needs neither a download nor sudo. And `run-dekaf.sh` now honours **`DEKAF_FRESH_DATA=1`**: it seeds a
throwaway data dir with `js/` + `proto/` and points `DEKAF_DATA_DIR` at it, which CI sets - so Library
items no longer accumulate across runs. Local dev keeps its persistent library by default.

That throwaway tree used to be a `mktemp -d`, and **leaked on every CI build**: `run-dekaf.sh` ends in
`exec sbt run`, so the process that created it is replaced by the server, and CI then kills the whole
process tree - no trap or shutdown hook in the server's own lifetime can fire, and the random name
left nothing findable afterwards. The path now comes from **`scripts/fresh-data-dir.sh`** (one
deterministic directory **per stack** under `$RUNNER_TEMP`, falling back to `$TMPDIR`):
`run-dekaf.sh` clears the previous run's tree before seeding, and **`stack-down.sh`** - the teardown
step CI already runs with `if: always()` - removes it.

*Per stack* is the second half of the fix and arrived after the first: a single deterministic name is
shared by every stack on the box, and since startup `rm -rf`s it and teardown `rm -rf`s it again, two
stacks side by side - a second Dekaf on its own port, which is exactly how you run two - destroyed
each other's **live** data dir. The identity is derived rather than configured, from the two
variables that already distinguish the stacks and are already in both scripts' environment:
`DEKAF_PORT` and `PULSAR_CONTAINER_NAME`. Teardown must therefore be run with the same values the
stack came up with (CI sets `DEKAF_PORT` at job level, so every step of the job agrees); getting it
wrong now leaks a tree instead of destroying a live one, and `clean` prints any tree it deliberately
left behind so that leak is visible. `harness.StackScriptsSpec` (STACK-1..4) pins the determinism,
the removal, that two identities cannot collide - cleaning one leaves the other's seeded data byte
for byte - and that both scripts still go through the shared path.

Two more fixes that had no permanent regression now have one, in both cases because the failing
condition does not occur on a healthy local stack and had to be **created**:

- **LIB-22** delays `ListLibraryItems` from inside the page (a wrapped `XMLHttpRequest.send`, not a
  Playwright route handler - a Java handler that sleeps blocks the driver's own dispatch loop and
  would stall the test's `isVisible` call too, hiding the race). It asserts the Notes panel really is
  unsettled and that `LibrarySidebar.createNote` still works. Reverting `createNote` to its
  pre-fix `isVisible` branch makes it time out on `lib-new-note`, which is the original symptom.
- **CS-33** blocks `cdn.jsdelivr.net` outright and asserts a Monaco editor still mounts, that the
  files came from `/ui/static/dist/vs/`, and that nothing reached for the CDN. Blocking rather than
  merely observing is the point: on a runner with internet, a regression would silently succeed
  through the CDN and prove nothing about the offline case. *Still unproven:* the loader path is
  built against `document.baseURI` so that it survives a non-root `DEKAF_PUBLIC_BASE_URL` /
  `basePath`, and this stack serves Dekaf at the root - where the base-relative and origin-rooted
  forms are the same string. The second Dekaf on a sub-path that this needs now EXISTS
  (`harness.DekafInstance`; CFG-BP-1 asserts every asset the app requests resolves under the
  sub-path and nothing 404s), but no test mounts a Monaco editor on such an instance, so the AMD
  loader path specifically is still uncovered.

**Configuration properties (`DEKAF_*`)**

Until 2026-08-08 no test in this suite set any `DEKAF_*` variable beyond the three connection
basics, so every path that turns an operator's SETTING into behaviour was unexercised end to end.
That gap was worse than a coverage count suggests: the two cookie-hardening bugs that shipped -
`Secure` computed into a local and never interpolated into the header, and `cookieSameSite` matched
against lowercase literals only, so a capitalised `Lax` emitted NO attribute at all - were both
config-to-behaviour WIRING failures, and both were invisible to every tier because each test called
the cookie writer with hand-passed parameters, bypassing the plumbing entirely.

`harness.DekafInstance` is the affordance that closes it: it starts a short-lived Dekaf with
arbitrary `DEKAF_*` overrides on a **probed** free port (8700-8799, deliberately clear of `:8080`
and of the shared stack's `:8090`) with a seeded `DEKAF_DATA_DIR` of its own, polls `/health`
through the embedded Envoy for real readiness, and always tears the whole thing down - the JVM, its
Envoy child, the port, and the data dir - including on failure. Instance logs are kept under
`target/config-instances/`; they are the only diagnosis when a server refuses to boot. Specs live in
`configuration/` and navigate ABSOLUTE URLs, because `DekafSuite`'s BrowserContext baseURL still
points at the shared stack. Two harness traps found while building it, both now fixed in
`DekafInstance` and worth knowing about:

- probing a free port by BINDING it is not enough - Java's `ServerSocket` sets `SO_REUSEADDR`, so the
  wildcard bind succeeds on macOS while another process holds the same port on `127.0.0.1`. Envoy
  then binds the wildcard too, loopback traffic goes to the *other* program, and the readiness poll
  gets a 401 from something that is not Dekaf. It now connects first and only trusts a refusal.
- the JDK `HttpClient` defaults to HTTP/2, i.e. an `Upgrade: h2c` probe on the first request to each
  new origin - and every instance here is a new origin. Jetty answers that `400 Invalid Upgrade
  header`, which the readiness poll cannot tell from "not ready yet". It is pinned to HTTP/1.1.

Covered, every assertion through the browser and across the Envoy proxy:

- **`cookieSameSite` x `cookieSecure`** - `CfgCookieSpec` CFG-COOKIE-1..4 add a credential through
  the real UI and assert the intercepted `Set-Cookie`'s attribute list EXACTLY (sorted, so order is
  free but a missing `Secure` or a smuggled `Domain=` cannot hide). CFG-COOKIE-1 configures
  `Lax` in mixed case on purpose - the exact spelling that shipped broken - and additionally asserts
  the browser STORED the cookie hardened; -2 covers `strict` with `cookieSecure` unset; -3 covers
  `NONE` with `Secure`; -4 pins the guard rail that `none` WITHOUT `Secure` emits no `SameSite` at
  all, because a browser would reject the whole cookie and break authentication.
- **`basePath`** - `CfgBasePathSpec` CFG-BP-1 serves the app at `/dekaf-e2e` and asserts it WORKS
  there: a deep link loads, breadcrumbs render from a gRPC-web round trip, in-app navigation stays
  under the sub-path (the router's basename), every `/api/` call resolved under it, static assets
  were served from it with nothing 4xx, and the cookie `Path` is the sub-path - plus that the origin
  ROOT serves nothing, which is what separates "the app moved" from "the app answers everywhere".
  This is also the only coverage the embedded Envoy's routing has ever had.
- **`publicBaseUrl`, isolated from `basePath`** - `CfgPublicBaseUrlSpec` CFG-PBU-1 uses the shape
  where the two genuinely differ, a reverse proxy that STRIPS the prefix: Dekaf served at the
  internal root, `publicBaseUrl` carrying the public mount point. It asserts `document.baseURI`,
  that assets were really REQUESTED under the public prefix, and the cookie `Path`.
- **`pulsarName` / `pulsarColor`** - `CfgInstanceIdentitySpec` CFG-ID-1/2. The name must render in
  the navigation tree root and the instance-overview row; the colour must reach the DOM as the
  accent element's COMPUTED `box-shadow`.
- **`dataDir`** - `CfgDataDirSpec` CFG-DD-1 saves a Library item on one data dir and asserts a second
  instance on another cannot see it, a THIRD instance on the first one can (so the absence is
  isolation rather than a lookup that never finds anything), and the item's bytes are on disk under
  the configured directory - an oracle independent of the UI that wrote it, which the Library
  otherwise has none of.
- **`defaultPulsarAuth`** - `CfgDefaultAuthSpec` CFG-AUTH-1 configures a JWT-shaped credential whose
  token is the literal words `e2e.dummy.token` (no secret, real or fake, belongs in this repo) and
  asserts it is the Default credential's TYPE in the manager, is CURRENT, is in the `pulsar_auth`
  cookie, and actually builds working Pulsar clients. `empty` would have been benign too, but it is
  also the built-in default, so it could not tell a working configuration from an ignored one.

**Not covered, and why:**

- **The ~15 `pulsarTls*` properties, plus `protocol` / `tlsCertificateFilePath` / `tlsKeyFilePath`**
  need a TLS-enabled Pulsar and a certificate fixture. `dekaf-e2e-pulsar` is plaintext and this
  harness ships no certs; `protocol: https` additionally makes Envoy terminate TLS, so the browser
  side would need its own trust setup. No tier covers their EFFECT - `server`'s `mergeConfigsTest`
  only proves the values survive config merging.
- **`bindAddress`, `port`, `internalHttpPort`, `internalGrpcPort`** are infrastructure with no
  distinct browser-observable behaviour. `port` is in fact exercised on every instance
  `DekafInstance` starts (each one is a different port), just never asserted as itself.
- **`pulsarWebUrl` / `pulsarBrokerUrl`** are exercised implicitly by the entire suite - every test
  reads and writes Pulsar through them - and again by every config instance.
- **`pulsarListenerName`** needs advertised listeners configured on the broker. The standalone
  container declares none, so setting it can only produce a connection failure, never a behaviour.
- **Envoy's other settings** (CORS, `max_request_headers_kb`, the gRPC stream timeouts) have no
  coverage; CFG-BP-1 exercises its ROUTING only.
- **Staleness of the staged build - a real caveat, not a nicety.** These specs run
  `server/target/universal/stage/bin/dekaf` rather than `sbt run`, so that the test holds the
  server's own process handle (sbt forks the app into a grandchild, and killing sbt can leave it
  alive holding the port). That build is staged only when MISSING, or on
  `DEKAF_SERVER_STAGE=force`: an `sbt stage` launched from inside a running e2e run shares this
  run's `~/.ivy2` locks and intermittently exits 1 with no diagnostic at all, which made staging on
  every run flakier than the staleness it prevents. **After editing `server/`, re-run these specs
  with `DEKAF_SERVER_STAGE=force`** (or `cd server && sbt stage` first), or they test the previous
  build. If staging fails three times and a build already exists, the harness falls back to it and
  says so loudly on stderr.

**Assertions thinner than the feature they name** (acknowledged, not defects)
- **CS-23** asserts the details panel opens, not its tab contents. (CS-16/17 used to sit here for
  broker-side consumer presence; the lifecycle specs now assert broker consumer counts on stop.) (**CS-28** used to sit here too;
  it now parses the exported `.zip` and compares exact `(index, key, value, topic)` records in order,
  so only the fields the broker owns - message id, publish/event time, size, producer name - are
  left unpinned.)
- **TOP-3/4, SUB-3** assert success toasts rather than a polled state change; **RES-2** supplies a
  missing id, not a malformed persisted config; **LIB-18** proves the `?id=` URL loads, not that the
  exact saved config restored.
- **Read-only stat views** (INS-9/10 · TOP-11/12 · SUB-7) are render-smoke - the anchor renders with no
  crash; they don't assert specific stat values.
- **Catalog breadth** is narrower than some pages: e.g. TEN-1 omits cluster add/remove; NS-8 runs
  split + clear-backlog but not unload/unload-all; TOP-7 doesn't verify Earliest/Latest cursor
  semantics; Producer properties/event-time have testIds but no dedicated test yet.

**Counting is not identity - the high-pressure delivery specs** (strengthened 2026-08-08)

`CsPauseLoopSpec` CS-PL-1 and `CsFlowControlSpec` CS-FC-1 used to conclude "zero loss" from the
final message COUNT. A count cannot: one message lost anywhere plus one delivered twice anywhere
reaches exactly the same number, and 1,005 *wrong* messages satisfy "1,005 survived the cut" as
readily as the right ones. `cs-loaded` is not even read from the delivered rows - it is the server's
own `numMessageSent` - so it cannot see a message counted but never shown, or shown but never
counted. Both specs now produce **unique payloads** (`bk-*`/`burst-*`; `a-*`/`b-*` per topic), take
their expectation from a **broker read-back**, and compare the exact MULTISET through
`features.consumersession.DeliveredMessages`. `harness.DeliveredMessagesSpec` (SET-1..4) is the
permanent record that the comparison catches what the count does not: it runs both oracles over one
loss plus one duplicate and pins the count accepting it. That spec is pure - no browser, no broker.

Three things make this work, and each is a trap if you write another one:

- **Read the set through the app's EXPORT** (`ConsumerSessionPage.exportedValues`), not the table.
  `allColumnValues` walks the virtualized list and gives up after 300 viewport steps - a few
  thousand rows on this 1280x800 context - so it cannot reach a 55,000-message set at all.
- **The session must be PAUSED to export.** While running, the app renders and exports only its last
  250 messages, so a running export silently compares a tail; `exportedValues` refuses to run.
- **Display retention is part of the arrangement.** A session keeps 10,000 messages on screen by
  default and drops its oldest past that, so beyond 10,000 the delivered set is *unobservable* and
  only counts remain. CS-PL-1 raises the session's own `numDisplayItems` limit above its total
  (`cs.setNumDisplayItems`) and then asserts `data-cs-retained` equals it, so a limit that did not
  take effect fails as itself rather than as a mysteriously missing 45,000.

Counts are KEPT alongside the sets, on purpose, and two places say so inline so a later reader does
not "fix" them away: they come from a different source (the server's counter) and are read after a
quiet window, which catches a straggling extra delivery arriving *after* the set first matched.
CS-FC-5's plateau bounds and CS-FC-2's `loaded == 0` stay counts outright - a byte watermark is a
statement about how many bytes were admitted, and zero already is an exact set.

**The delivery-order x liveness matrix - the exact-replay contract, cell by cell** (`CsDeliveryModesSpec`, aligned 2026-08-09)

The three delivery-order modes crossed with every way a topic can be alive, one clearly-labelled
cell per combination, and one CARDINAL RULE: every cell pins its mode EXPLICITLY through the
`cs-delivery-order` control - no cell depends on the session default, so the matrix keeps meaning
the same thing whichever mode the owner makes the default. (`CsMergeOrderSpec` CS-MO-0 is the one
test that pins what the default IS - Best effort, per the owner decision of 2026-08-09, which
supersedes the 2026-08-08 decision that said Guaranteed.)

**Guaranteed is an EXACT REPLAY** (owner decision 2026-08-09, landed with server + UI on this
branch): Play captures every stream's recorded end; the session delivers everything recorded up
to that boundary in strict key order, then AUTO-PAUSES on the ordinary paused state with the
caught-up banner (`cs-replay-caught-up`). A message published after Play belongs to the NEXT
chunk - handed back un-acked, its consumer held - and an explicit Resume extends the boundary to
now and replays the delta exactly. "Continue live with Best effort" (on the banner) is the
designed transition out of the replay into live following. The hold-forever behavior these cells
used to pin - and the `PINS THE CURRENT PRODUCT DECISION` markers that guarded it - are gone;
every old hold expectation was first CONFIRMED failing against the redesigned stack (full sets
delivered, sessions auto-paused) before its cell was re-aimed.

The liveness states, and what each Guaranteed cell now proves:

- **A ALL LIVE** (CS-DM-AF/AB/AG) - two topics, both receiving during the session: two logical
  topics give the test an independent live producer per stream. Fastest delivers everything exactly
  once (no order asserted - Fastest is the absence of the merge); Best effort delivers in global
  publish-time order; Guaranteed turns live traffic into CHUNKS - the recorded range replays and
  pauses, post-Play traffic stays settled at zero until Resume replays it as the next chunk,
  exactly once, order intact across both chunks.
- **B ALL STATIC** (CS-DM-BF/BB/BG) - one 3-partition topic, backlog on every partition: the
  one-click "browse this topic" shape. Fastest and Best effort complete the backlog (the ~0.75s
  reorder grace is what releases Best effort's tails); Guaranteed replays the WHOLE backlog - a
  drained partition holds nothing back - then auto-pauses, with no stall chip, no newer-entries
  line and no excluded-topics line (a zero is silence; R1 pins the positive halves).
- **C MIXED** (CS-DM-CF/CB/CG) - two topics, one live and one stopped before Play. Under
  Guaranteed the stopped topic holds NOTHING back: the recorded range replays whole (including
  what the old contract held behind the silent stream), the live tail waits past the boundary,
  and Resume delivers the accumulated delta exactly once.
- **D EDGES** - empty-from-birth partitions (D1: backlog on one partition of three, the other two
  never spoke - an empty recorded range is trivially FINISHED, so the backlog replays in full,
  promptly, with no waiting chip; pause-window words on all three partitions then arrive together
  as the next chunk); static-becomes-live (D2: the late word to a finished topic is recorded PAST
  the boundary - banner first, then Resume delivers it, order intact); a single non-partitioned
  topic (D3: one stream needs no MERGE - Fastest/Best effort stay chip-free - but the replay
  boundary is not a merge property: Guaranteed builds its layer at ANY stream count, so the chip
  announces the replay and the static single topic pauses caught-up like any other shape);
  Guaranteed x non-persistent multi-stream (D4: refused at create, by name, with the remediation -
  the session delivers nothing; the SINGLE non-persistent stream is CS-MO-0B's instant caught-up);
  the one-click switch (D5, below); and ownership churn (D6, below).
- **D5 THE SWITCH** (CS-DM-D5G) - from the caught-up pause, the banner's "Continue live with Best
  effort" (the only broker-level exercise of the SetDeliveryOrder RPC) releases the boundary and
  the session follows live traffic: the pause-window words flow, a fresh round arrives with no
  Resume, everything exactly once across the transition, and EXACTLY ONE divider badge
  (`cs-order-switch-point`, "Best effort from here") sits on the first row delivered after the
  switch - rows above are the exact replay, rows below the bounded-reorder live following. The
  switch also writes Best effort back into the config (pinned at the jest tier).
- **D6 CHURN** (CS-DM-D6G/D6B/D6S) - `admin.topics().unload` on ONE stream's topic mid-session:
  the broker drops and re-owns the topic, the session's consumer silently reconnects, and
  everything received-but-unacknowledged is REDELIVERED - the standalone reproduction of what a
  topic ownership move does on a multi-broker cluster, observed rather than assumed (the cell
  waits for the consumer's `connectedSince` stamp to change). D6G is the replay's regression
  gate: the unload lands mid-replay (6,000 messages give it a deterministic window), a
  boundary-nacked word sits un-acked on the churned topic, and the chunk must stay EXACT across
  the reconnect - every redelivered copy counted against the SAME replay range (the caught-up
  count is exactly 6,000, never 6,001), the broker's bracketed dispatch counter proving
  redeliveries really reached the session, and Resume then delivering the held next-chunk word
  exactly once. D6S parks a skip-first-14 mid-count (12 seeded, dispatched, none shown),
  unloads one stream, and asserts the two survivors BY NAME - a double-spent or under-spent
  budget picks the wrong survivors, not just the wrong count. Fastest is skipped in D6: it makes
  no ordering claim for churn to break, and its exactly-once under pressure is CS-PL/CS-FC's.
- **R REPLAY** (CS-DM-R1/R2/R3/R3B) - the redesign's own cells. R1: the banner names the boundary
  instant ("Caught up to <t>") and, because words were recorded past the boundary mid-drain, the
  approximate newer-data line ("~N newer entries" - the broker counts entries, so the banner
  never claims an exact message count); the excluded-topics line stays silent with no regex in
  play. R2: Resume extends the boundary REPEATABLY - three chunks through one session, each delta
  exact, the banner returning at every new boundary. R3: Latest x Guaranteed's GATE - the
  start-from select disables "Latest message" under Guaranteed with the note ("Guaranteed replays
  recorded history - to follow live, use Best effort."), in BOTH directions, never rewrites the
  stored value, and re-enables on leaving Guaranteed. R3B - the combination's PLAY behavior on a
  topic that HOLDS a backlog (instant caught-up over an empty boundary, the pre-play backlog
  unread, chunk verbs intact) - caught a real first-play boundary-clobbering bug on 2026-08-09
  and now pins the fixed contract: the create is the first Play, and the boundaries decided at
  create are the first chunk's.

Every cell's identity oracle is the exact MULTISET via `exportedValues` +
`DeliveredMessages.assertExactly` (a loss and a duplicate cannot cancel), with arrival order read
separately (`allColumnValues`) wherever the mode promises one, and `settledLoaded`'s bounded quiet
window only ever asserting "nothing more arrives".

**The seam flag has no e2e cell, deliberately.** A seam violation needs a producer clock writing
an earlier timestamp into a pause window - controlled clock skew, unit-tier territory (the
hand-clock tests next to the merge). What the replay/resume cells DO assert, everywhere a
boundary is crossed: ZERO seam flags in ordinary flows - the session counter chip
(`cs-replay-seam-violations`) stays absent and no row carries `cs-seam-violation-marker` - so a
false positive cannot ship unnoticed.

Alongside the matrix, the same redesign re-aimed the other Guaranteed pins: `CsMergeOrderSpec`
CS-MO-G1 (complete replay in exact key order, then the boundary pause), CS-MO-G2 (post-Play words
wait for the next chunk; Resume replays the delta), CS-MO-T1 (the documented tiebreak over real
publish-time ties, now across the WHOLE recorded set), CS-MO-0B (a single non-persistent stream
is an instant caught-up - nothing recorded, nothing replayed, and a word published into the pause
is honestly gone); `CsWideTopologySpec` CS-WT-2 (the barrier finishes at width 200 - the whole
20,000 replays, auto-pauses, and one closing word per partition arrives as a 200-message Resume
delta); and `CsFlowControlSpec` CS-FC-5 (the byte watermark's hold is now an UNDELIVERABLE
recorded range - a force-deleted mid-drain topic - because an empty-at-boundary stream no longer
holds anything; its dispatch-counter oracle is CONNECTION-EPOCH-BRACKETED, since the broker's
counter counts dispatches, resets with the consumer, and a transient reconnect redelivers the
whole un-acked held window - read bare, that once looked like 400 MiB admitted past a 256 MiB
cap). CS-FC-2 kept its give-up contract untouched but needed one arranged premise: the tools
console now opens by default, so the collapsed-console layout oracle closes it first.

**A live-edge stream resumed AGAIN with no delta re-arms the wait** (known corner, disclosed, no
e2e cell - owner decision pending). A second resume RPC - which is the FIRST Resume the user
presses, since the create's Play consumed the boundary - of a Guaranteed session whose stream sits
at the live edge with NOTHING recorded since re-captures a boundary the extension cannot classify:
nothing was ever offered on that stream, so "cursor already at the end" and "cursor before the
end" look identical, and the barrier re-arms the wait. The session then stalls WITH the existing
stall disclosure (`cs-order-waiting`) until any traffic finishes the stream - honest, but not the
instant re-caught-up a user might expect. The fix would need a live-edge cursor floor recorded at
create - one extra read on the Latest fast path - and is deliberately not built until the owner
decides it is worth that cost.

**Start-From: batching, and the entry-vs-message trap** (bug FIXED 2026-07-25; coverage now green)

A Pulsar broker addresses its log by **entry**, and the Java producer packs many messages into one
entry by default. `PulsarAdmin.examineMessage` - which "Skip first n messages" and "Latest n
messages" used to be built on - therefore counts entries, not messages. Every fixture the suite had
produced *one message per entry* (a blocking `send` closes a one-message batch every time), so entry
positions and message positions always coincided and the difference was invisible: "skip the first
5" actually skipped 8 (or 50), and nothing caught it.

`PulsarFixtures` now offers `produceBatched` / `produceUnbatched` / `numberOfEntries` /
`readAllMessages` / `messageIdHex`. **`produceBatched` throws** if the messages did not actually
share entries - an unbatched "batched" fixture would silently recreate the blind spot it exists to
close. `harness.BatchingFixtureSpec` (BATCH-1..4) pins the broker facts underneath: batching really
happens, `examineMessage` is entry-addressed, past the end it *clamps* on `"earliest"` but *throws*
on `"latest"`, and an empty partition cannot answer at all.

Outcome coverage per mode lives in `CsStartFromOutcomesSpec` (CS-SF-1..19 and CS-SF-22, persistent
non-partitioned, batched and unbatched), `CsStartFromMatrixSpec` (skip-n / latest-n x batched /
unbatched x the whole `TopicKind` matrix, plus the spread-across-partitions cases) and
`CsApproximatePartitionedSpec` (CS-SF-20/21, the two approximate modes on a partitioned topic). The
contracts asserted, as implemented:

- **Skip first n** drops n messages of the session's merged stream and delivers the rest - n in
  TOTAL, across every physical topic. The merge takes each partition in its own append order and
  compares publish times across the partitions' current heads, so on same-clock producers this is
  the n globally-earliest; where producer clocks disagree, which n can shift while the count stays
  exact. On a single ordered log it is exactly "start at message n + 1". `n = 0` shows everything.
- **Latest n** delivers **exactly n in total**, not n per partition, under the same head-comparison
  ordering.
  (Until 2026-07-25 it was resolved per physical topic, so "latest 2" on a 3-partition topic returned
  six; CS-SFM-4 is the regression against that.) `n = 0` shows nothing and streams only what arrives
  after play. One deliberate edge: if two ENABLED TARGETS select the same topic, each target delivers
  its own counted set through its own subscription - see the duplicate-target contract note in
  `handleStartFrom.scala`.
- **Approximate position (% of data)** is by ENTRY, not by message - it has to resolve in constant time at
  any topic size - so 50% of twelve messages lands on m-07 written one per entry, while deliberately
  uneven batches can put it at a very different message position. CS-SF-11/12 assert exactly that
  difference from the broker's entry count. 0% is Earliest, 100% is Latest, and a percentage outside 0-100 is refused
  without reaching the session - **CS-SF-14 presses Play with the rejected text still on screen**, so
  what it pins is that the invalid value never reaches the session (the run comes out at the last
  valid one), not merely that correcting the field afterwards works.
- **Approximate position (% of time)** interpolates between the first and last PUBLISH TIMES instead
  and seeks to the resulting instant, so the same 50% lands somewhere else whenever messages did not
  arrive evenly. CS-SF-16 pins the proportionality (25% and 75% of a 12-second range, each falling in
  the middle of a gap); **CS-SF-17 asks one topic the same "50%" with both modes and asserts the two
  different answers** - two old messages plus a burst of ten, where half the time is back in the
  empty stretch while half the entries are inside the burst. Its endpoints are deliberately NOT the
  entry mode's: 0% is Earliest but **100% includes every message tied at the latest publish
  timestamp** (CS-SF-18), because the time range ends at that timestamp rather than past it.
  CS-SF-19 presses Play on the rejected value the same way CS-SF-14 does. Separate logical topics
  DO share one range (P2.15): CS-SF-22 gives two topics disjoint ranges and proves the session
  resolves a single cutoff across both - it asserts the pooled answer and keeps the per-topic one
  as the counterexample, so a regression to a range per topic fails there.
- **The two approximate modes diverge on a PARTITIONED topic**, and that is where their definitions
  actually differ: the entry mode resolves **every physical topic independently** (each partition
  leaves `floor(fraction x its own entry count)` entries behind) while the publish-time mode groups the
  partitions by logical topic, pools `min(first publish time)` .. `max(last publish time)` across the
  group, and seeks **every** partition to that one instant - so an idle partition cannot drag the
  cutoff backwards and a late-starting one gets no range of its own. `CsApproximatePartitionedSpec`
  CS-SF-20/21 arrange one topic skewed on both axes at once (partitions holding 8 / 4 / 2 / **0**
  messages over three different stretches of a 12-second range, each pooled endpoint owned by exactly
  one partition) and assert the exact set for each mode, having first asserted that the two modes -
  and the mistake each is exposed to - really do give different answers on that arrangement.
  The **empty** partition is part of the arrangement, not an accident: `examineMessage` does not
  report an empty topic as an empty range, it *fails* (BATCH-4), so an empty partition reaches the
  server as an error it has to tell apart from an operational one, and both modes then have to skip
  it - counted as time zero it would drag the pooled start back to 1970 and turn 50% into Earliest.
  Both tests also gate on the session holding flow permits on **every** partition, the empty one
  included, so a server that quietly dropped it would fail rather than answer the same. The pure
  arithmetic stays in `server/src/test/scala/consumer/session_runner/approximatePublishTimePositionTest.scala`.
- **Non-persistent targets** cannot honour any history mode, and the selector now says so: all eight
  are rendered `disabled` with a note (`cs-start-from-non-persistent-note`), leaving only "Latest
  message". CS-SFM-2 and CS-TK-5 assert the exact disabled set rather than watching a
  permitted-but-meaningless selection behave.
- **Skip progress** (`cs-start-from-progress`) is deliberately silent at or below 1,000,000 messages
  to skip. CS-SF-15 asks for a 2,000,000 skip on a 12-message topic - `messagesToSkip` is what was
  asked for, not what exists - which is the one way to drive the server -> gRPC -> panel join that
  neither the jest nor the server tests can reach. It requires `data-cs-skipped` to be **strictly
  positive**: the server reports as soon as the discard claims its first message, so a zero would be
  a frame the UI could have rendered from its own initial state rather than proof of a real callback.

Honest limits: the **non-persistent** quadrants cannot prove batching at all (no managed ledger, so
no `numberOfEntries`). The single-log cells still funnel their payload through **one** partition -
not because the global contract needs it, but because that is where "the first n" is a plain slice of
the payload and the cell stays readable.

`CsTopicKindsSpec` **CS-TK-6** was **untagged on 2026-07-25**: its `all.drop(2)` expectation is a
statement about a global order, which is exactly what Skip-N now promises. Verified green six runs
running. `CsStartFromMatrixSpec` CS-SFM-3/4 assert the same two contracts on a payload genuinely
spread over every partition, with the expectation derived from the **broker's own publish times**
(`globalOrder`) rather than from the produce order - and the arrangement spaces its publishes so that
no two messages in different partitions share a millisecond, which that helper asserts rather than
assumes.

CS-SFM-3/4 configure **no message filter, value projection or coloring rule** on purpose, so a
failure there is about start-from and nothing else.

What used to sit next door was a *concurrent-entry* hazard: a session gets **one** GraalVM JS context
(`ConsumerSessionContextPool` pins the pool to size 1) while a partitioned topic gives each partition
its own listener thread. GraalJS lets a context move between threads but not be entered by two at
once ("Multi threaded access ... is not allowed for language(s) js"), and nothing serialized them.
**That is now fixed**: `ConsumerSessionContext.exclusively` takes a reentrant lock and
`ConsumerSessionContextPool.withNextContext` leases it for a **whole message** - the filter chain,
the coloring rules, the projections and the `getStdout` drain all run inside one lease, so neither
the exception nor the subtler outcome (one message judged against another's `setCurrentMessage`
global) can happen. The browser console goes through the same lease.

Both of the races this section used to list next to it are **fixed**:

- *ordering* - `ConsumerListener.received` now resolves **and processes** inside
  `startFromOrdering.inOrder`, so a vector reaches the target handler in the order the merge chose;
- *concurrent observer entry* - start-from progress no longer calls `StreamObserver.onNext` itself.
  Every write goes through `ConsumerSessionRunner.sendResponse`, which holds `sendLock`.

The two hazards this section used to file as still-open - about the ORDER and TERMINATION of what the
observer is handed rather than about entering it - are **fixed** as well, and pinned at the server
tier in `server/src/test/scala/consumer/session_runner/sessionOutputSerializationTest.scala` (suite
"progress never goes backwards, and nothing follows the end of the stream"):

- `sendResponse` now **builds** its response - start-from progress included - **inside** `sendLock`,
  in the same critical section as the `onNext` and behind an `if !streamCompleted` check, so two
  threads can no longer snapshot an older, incomplete progress frame and send it after a newer
  complete one. Pinned by "AN OLDER PROGRESS FRAME CANNOT OVERTAKE A NEWER COMPLETE ONE".
- `stop()` now calls `observer.onCompleted()` **inside** `sendLock`, behind a sticky `streamCompleted`
  terminal gate, so nothing is written after completion and completion never interleaves with an
  `onNext` still in flight. Pinned by "NO RESPONSE REACHES THE CLIENT AFTER THE STREAM HAS BEEN
  COMPLETED" and "THE STREAM IS NOT COMPLETED WHILE A RESPONSE IS STILL BEING WRITTEN".

Because those are unit-pinned at the server tier, this suite does not reproduce them: a browser
cannot see which of two frames the server built first, and the window is a few instructions wide.
Probed 2026-07-25 at 400 messages over 3 partitions, with and without a JS filter: no
multi-threaded-access error appeared then, and none has appeared in a full run since.

**Open product/config questions** (not test gaps)
- **SUB-6**: Delete-Subscription's guard is the **topic FQN**, not the subscription name - the test
  encodes today's behavior; confirm it's intended.
- The optional cluster profile (`stack-up-cluster.sh` / `values-test.yaml`) pins a chart declaring
  Pulsar 2.10.2 while overriding the image to 3.2.1 - template-validated only, never deployed. Align
  versions before relying on it.

**Message shapes that are entries but not messages.** Start-from's entry-addressed modes inspect
LEDGER ENTRIES, and several Pulsar features break the one-entry-one-message assumption. They inspect
them differently, which decides who is affected: **Latest-n** and **Approximate position (% of data)**
COUNT entries, so anything that makes an entry not equal one message skews them. **Approximate
position (% of time)** only samples the first and last entry's TIMESTAMPS and then seeks by time, so
it is count-free and immune. Batching (many messages per entry) and chunking (one message across
many entries) are covered by self-asserting fixtures - `produceBatched`, `produceChunked`, and
`BatchingFixtureSpec` / `MessageShapeFixtureSpec` pin the broker facts so a fixture cannot silently
stop producing the shape it claims.

**Server-side markers have NO e2e coverage, and cannot**: transaction/replication markers occupy
entries but reach no consumer, and `dekaf-e2e-pulsar` runs with transactions disabled, so no marker
entry can exist in this harness. They are covered one tier down by `markerEntriesTest` (server) -
classification pinned with hand-built metadata, walk arithmetic with a pure lambda, and both verified
once against a throwaway transaction-enabled broker. `resolveLatestN` skips markers (a marker's exact
delivered count is zero, so crossing one stays correct); `ApproximateEntryPosition` is documented as
UNDETECTED there rather than fixed, because finding markers means examining entries, which is
O(topic) and defeats a mode whose whole value is a single counter read. Skip-n counts delivered
messages and all time-based positions are count-free, so both are immune.

**Regression coverage - the `KnownBug` lane** (catalogued bugs fixed; see §3). Twelve
run green as ordinary regressions in `knownbugs/*Spec` (BUG-1,3,4,5,6,10,12,13,14,15,18 +
BUG-19→NAV-14). Five are fixed app-side but not driveable from Playwright and have **no e2e test at
all** - not an `ignore`d one; the suite carries none (§3). They are covered in another tier instead:
**jest** component tests (BUG-2/7: `KeyValueEditor` / `AvailableInContextsButton`) and **server**
unit tests (BUG-8/9/17: `LibraryBugRegressionsTest`), with a pointer at the foot of
`MoreKnownBugsSpec` where they would otherwise have lived.
**Two were reclassified as intended design** after owner review: **BUG-11** - auto-refresh is
deliberately ONE global toggle ("we either want to refresh any table, or not"); a `MoreKnownBugsSpec`
test now pins the global-shared semantics. **BUG-16** - per-connection library-storage scoping was
reverted: a Dekaf instance always serves one Pulsar, so isolation lives at the deployment layer
(the desktop app gives each saved connection its own `DEKAF_DATA_DIR`; docker runs one dekaf per
pulsar). The library dir stays flat; the path-traversal guard (BUG-17) is unaffected.
