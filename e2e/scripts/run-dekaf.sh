#!/usr/bin/env bash
#
# Run the Dekaf server locally on :8090, pointed at the e2e Pulsar standalone.
# Prereqs: node + npm (UI build), sbt, and the per-arch envoy.bin shipped in bin/.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"

ADMIN_PORT="${PULSAR_ADMIN_PORT:-18080}"
BROKER_PORT="${PULSAR_BROKER_PORT:-6650}"
DEKAF_PORT="${DEKAF_PORT:-8090}"

# The embedded Envoy proxy (what actually listens on DEKAF_PORT) must be on PATH.
bin_dir="$(node "$repo/bin/get-bin-dir.js")"
export PATH="$PATH:$bin_dir"

export DEKAF_PORT
export DEKAF_PUBLIC_BASE_URL="http://localhost:${DEKAF_PORT}"
export DEKAF_PULSAR_WEB_URL="http://localhost:${ADMIN_PORT}"
export DEKAF_PULSAR_BROKER_URL="pulsar://localhost:${BROKER_PORT}"
export DEKAF_PULSAR_NAME="dekaf-e2e-local"

# --- Clean-checkout prerequisites (both are gitignored build artifacts) ---------------------------
# 1) ui/node_modules - the UI build needs its deps installed.
if [ ! -d "$repo/ui/node_modules" ]; then
  echo "Installing UI dependencies (ui/)..."
  (cd "$repo/ui" && { npm ci || npm install; })
fi

# 2) server/data/js/dist/libs.js - ConsumerSessionContext.scala reads this at startup, so the server
#    fails to boot without it. Built by `server/Makefile: build-any` (cd data/js && npm i && npm run build).
if [ ! -f "$repo/server/data/js/dist/libs.js" ]; then
  echo "Building the consumer-session JS bundle (server/data/js)..."
  (cd "$repo/server/data/js" && npm install && npm run build)
fi

echo "Building UI bundle (ui/)..."
(cd "$repo/ui" && npm run build)

# --- Optional per-run data isolation (DEKAF_FRESH_DATA=1) -----------------------------------------
# Without this the Library writes into $repo/server/data/library and accumulates forever, so
# instance-scoped items (e.g. LIB-16's note) leak between runs and item counts drift. Opt-in
# rather than default because a local dev session usually WANTS its library to persist.
# A bare empty dir will not boot: ConsumerSessionContext reads js/dist/libs.js from the data dir,
# and the schema tooling reads proto/ - so seed both from the repo copy (built just above).
#
# The path is DETERMINISTIC (scripts/fresh-data-dir.sh) rather than `mktemp -d`. This script ends in
# `exec sbt run`, so the process that created the tree is gone by the time anyone could clean it up,
# and CI kills the resulting process tree outright - no trap here would ever fire. A known path is
# what lets the previous run's tree be cleared below and the current one be removed by the teardown
# step (stack-down.sh). With `mktemp -d` every build left one behind on the self-hosted runner.
#
# It is also PER STACK: the `rm -rf` below is why one shared path was dangerous - a second Dekaf on
# its own port would have wiped this one's live data dir on startup, and its teardown would have
# wiped it again. fresh-data-dir.sh derives the identity from DEKAF_PORT (exported above) and
# PULSAR_CONTAINER_NAME, both of which this script's environment already carries.
if [ "${DEKAF_FRESH_DATA:-}" = "1" ]; then
  fresh_data="$("$here/fresh-data-dir.sh" path)"
  rm -rf "$fresh_data"
  mkdir -p "$fresh_data/library"
  cp -R "$repo/server/data/js" "$fresh_data/js"
  cp -R "$repo/server/data/proto" "$fresh_data/proto"
  export DEKAF_DATA_DIR="$fresh_data"
  echo "Using a fresh data dir (DEKAF_FRESH_DATA=1): $fresh_data"
fi

echo "Starting Dekaf on :${DEKAF_PORT} → admin :${ADMIN_PORT}, broker :${BROKER_PORT} ..."
cd "$repo/server" && exec sbt run
