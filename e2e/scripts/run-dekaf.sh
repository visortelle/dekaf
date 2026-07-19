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

echo "Starting Dekaf on :${DEKAF_PORT} → admin :${ADMIN_PORT}, broker :${BROKER_PORT} ..."
cd "$repo/server" && exec sbt run
