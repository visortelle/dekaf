#!/usr/bin/env bash
# Tear down the local Pulsar standalone started by stack-up.sh.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAME="${PULSAR_CONTAINER_NAME:-dekaf-e2e-pulsar}"
if docker rm -f "$NAME" >/dev/null 2>&1; then
  echo "Stopped and removed '$NAME'."
else
  echo "No '$NAME' container running."
fi

# The DEKAF_FRESH_DATA tree, if run-dekaf.sh made one. Nothing else can: that script `exec`s the
# server, and CI kills the process tree, so no trap or atexit in the server's own lifetime ever runs.
# This is the teardown hook CI already calls with `if: always()`, which is why the removal lives here.
#
# THIS stack's tree only - the path carries a stack identity derived from DEKAF_PORT and
# PULSAR_CONTAINER_NAME (the same variable that named the container above), so tearing one stack
# down cannot delete a concurrent stack's live data. Run this with the same values the stack was
# brought up with; `clean` prints any tree it deliberately left behind.
"$here/fresh-data-dir.sh" clean
