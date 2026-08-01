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

### The `KnownBug` mechanism (lane currently EMPTY)

While an app bug is open, its regression test asserts the **correct** behavior, is tagged `KnownBug`,
and stays **red on purpose** - excluded from `sbt test` (`Test / test / testOptions` in `build.sbt`)
so the normal run is green. When the bug is fixed, the test is **untagged** and joins the green lane
as an ordinary regression. All 19 originally catalogued bugs were fixed on 2026-07-19, so the
`knownbugs/*Spec` tests now run green in the normal lane. The last remaining tagged test,
`CsTopicKindsSpec` CS-TK-6, was **untagged on 2026-07-25** when both counting Start-From modes became
GLOBAL and its `all.drop(2)` expectation became the contract rather than more than it (§6,
"Start-From: batching, and the entry-vs-message trap"). No test carries the tag today, so the bug
lane runs **0 tests** - that is the healthy state, not a broken filter.

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
│   │                   Cli (ShowTrace / Codegen mains)
│   ├── ui/             reusable component objects (ConfirmationDialog, SubscriptionOverviewPage, …)
│   └── features/       component objects for the priority features
│       ├── library/            LibrarySidebar, LibrarySaveDialog, LibraryBrowser
│       └── consumersession/    ConsumerSessionPage, FilterPanel, TargetSelector, ExportModal, ToolsPanel
└── test/scala
    ├── harness/        DekafSuite (base trait: fresh BrowserContext + trace + fixtures per test),
    │                   BatchingFixtureSpec (the broker facts under Start-From), StackScriptsSpec
    │                   (scripts/), SuiteFactsSpec (this README's countable claims)
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
- **No independent Library oracle.** LIB CRUD arranges *and* verifies through the same UI path, so a
  shared serialization/render defect could pass both. A generated `LibraryService` gRPC stub would fix
  this - the one remaining piece of test infrastructure worth building.

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
  forms are the same string. Covering that needs a second Dekaf started on a sub-path.

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

Outcome coverage per mode lives in `CsStartFromOutcomesSpec` (CS-SF-1..19, persistent
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
- **About % through the data** is by ENTRY, not by message - it has to resolve in constant time at
  any topic size - so 50% of twelve messages lands on m-07 written one per entry and on m-05 written
  four per entry. CS-SF-11/12 assert exactly that difference, deriving the expectation from the
  broker's entry count. 0% is Earliest, 100% is Latest, and a percentage outside 0-100 is refused
  without reaching the session - **CS-SF-14 presses Play with the rejected text still on screen**, so
  what it pins is that the invalid value never reaches the session (the run comes out at the last
  valid one), not merely that correcting the field afterwards works.
- **About % through the time range** interpolates between the first and last PUBLISH TIMES instead
  and seeks to the resulting instant, so the same 50% lands somewhere else whenever messages did not
  arrive evenly. CS-SF-16 pins the proportionality (25% and 75% of a 12-second range, each falling in
  the middle of a gap); **CS-SF-17 asks one topic the same "50%" with both modes and asserts the two
  different answers** - two old messages plus a burst of ten, where half the time is back in the
  empty stretch while half the messages are inside the burst. Its endpoints are deliberately NOT the
  data mode's: 0% is Earliest but **100% is the last message itself** (CS-SF-18), because the time
  range ends at that message rather than past it. CS-SF-19 presses Play on the rejected value the
  same way CS-SF-14 does.
- **The two approximate modes diverge on a PARTITIONED topic**, and that is where their definitions
  actually differ: the data mode resolves **every physical topic independently** (each partition
  leaves `floor(fraction x its own entry count)` entries behind) while the time mode groups the
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
  arithmetic stays in `server/src/test/scala/consumer/session_runner/approximateTimePositionTest.scala`.
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
