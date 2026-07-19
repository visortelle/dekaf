#!/usr/bin/env bash
# Tear down the local Pulsar standalone started by stack-up.sh.
set -euo pipefail
NAME="${PULSAR_CONTAINER_NAME:-dekaf-e2e-pulsar}"
if docker rm -f "$NAME" >/dev/null 2>&1; then
  echo "Stopped and removed '$NAME'."
else
  echo "No '$NAME' container running."
fi
