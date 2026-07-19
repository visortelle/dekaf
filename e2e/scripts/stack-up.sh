#!/usr/bin/env bash
#
# Default LOCAL stack for the Dekaf e2e suite: a single Pulsar standalone in Docker.
# Lightweight and laptop-friendly (embedded ZooKeeper + BookKeeper). For a full
# multi-broker / multi-bookie cluster use ./stack-up-cluster.sh instead.
#
# Admin is published on :18080 (host :8080 is commonly taken locally), broker on :6650.
set -euo pipefail

PULSAR_VERSION="${PULSAR_VERSION:-3.2.1}"        # keep aligned with server/ pulsarVersion
ADMIN_PORT="${PULSAR_ADMIN_PORT:-18080}"
BROKER_PORT="${PULSAR_BROKER_PORT:-6650}"
NAME="${PULSAR_CONTAINER_NAME:-dekaf-e2e-pulsar}"

if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "Removing existing '$NAME' container..."
  docker rm -f "$NAME" >/dev/null
fi

echo "Starting Pulsar $PULSAR_VERSION standalone (admin :$ADMIN_PORT, broker :$BROKER_PORT)..."
# force-delete flags let the per-test teardown wipe tenants/namespaces cleanly.
docker run -d --name "$NAME" \
  -p "$ADMIN_PORT:8080" \
  -p "$BROKER_PORT:6650" \
  -e PULSAR_PREFIX_forceDeleteNamespaceAllowed=true \
  -e PULSAR_PREFIX_forceDeleteTenantAllowed=true \
  apachepulsar/pulsar:"$PULSAR_VERSION" \
  sh -c "bin/apply-config-from-env.py conf/standalone.conf && bin/pulsar standalone" >/dev/null

printf "Waiting for broker to become ready"
for _ in $(seq 1 90); do
  if curl -sf "http://localhost:$ADMIN_PORT/admin/v2/brokers/ready" >/dev/null 2>&1; then
    echo " ready."
    echo "Clusters: $(curl -s "http://localhost:$ADMIN_PORT/admin/v2/clusters")"
    cat <<EOF

Pulsar is up.
  PULSAR_ADMIN_URL=http://localhost:$ADMIN_PORT
  PULSAR_SERVICE_URL=pulsar://localhost:$BROKER_PORT

Next:
  1) start the Dekaf server:   e2e/scripts/run-dekaf.sh
  2) run the tests:            cd e2e && PULSAR_ADMIN_URL=http://localhost:$ADMIN_PORT sbt test
  (or copy e2e/.env.example → your shell env)
EOF
    exit 0
  fi
  printf "."
  sleep 2
done

echo
echo "Timed out waiting for Pulsar to become ready. Recent logs:"
docker logs --tail 40 "$NAME" || true
exit 1
