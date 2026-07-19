#!/usr/bin/env bash
#
# OPTIONAL "full-shape" LOCAL stack: a multi-broker / multi-bookie Pulsar cluster via the
# official apache/pulsar Helm chart on a local k3d cluster. Heavier than stack-up.sh - use
# when you need multi-broker behavior (or, later, geo-replication with a second release).
#
# Prereqs: docker, k3d, kubectl, helm.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

K3D_CLUSTER="${K3D_CLUSTER:-dekaf-e2e}"
CHART_VERSION="${PULSAR_CHART_VERSION:-3.0.0}"
NS="${PULSAR_NS:-pulsar}"
RELEASE="${PULSAR_RELEASE:-pulsar}"
ADMIN_PORT="${PULSAR_ADMIN_PORT:-18080}"
BROKER_PORT="${PULSAR_BROKER_PORT:-6650}"

if ! k3d cluster list | awk '{print $1}' | grep -qx "$K3D_CLUSTER"; then
  echo "Creating k3d cluster '$K3D_CLUSTER'..."
  # 1 server + 2 agents = 3 nodes. The chart gives bookies a mandatory hostname anti-affinity, so
  # values-test.yaml's 3 bookie replicas need 3 distinct nodes or one stays Pending and --wait times out.
  k3d cluster create "$K3D_CLUSTER" --agents 2
fi
kubectl config use-context "k3d-$K3D_CLUSTER" >/dev/null

helm repo add apache https://pulsar.apache.org/charts >/dev/null 2>&1 || true
helm repo update apache >/dev/null

echo "Installing Pulsar (chart $CHART_VERSION, release '$RELEASE' in ns '$NS')..."
kubectl create namespace "$NS" >/dev/null 2>&1 || true
helm upgrade "$RELEASE" apache/pulsar \
  --install --version "$CHART_VERSION" \
  --namespace "$NS" \
  --set clusterName="$RELEASE" \
  -f "$here/values-test.yaml" \
  --timeout 15m --wait

echo "Port-forwarding admin :$ADMIN_PORT and broker :$BROKER_PORT (leave this running)..."
# Forward to the proxy service's NAMED ports: its HTTP service port is 80 (not 8080 - that is the
# container port), so a numeric "$ADMIN_PORT:8080" fails. Names are stable across chart versions.
kubectl -n "$NS" port-forward "svc/${RELEASE}-proxy" "$ADMIN_PORT:http" "$BROKER_PORT:pulsar" &
PF_PID=$!
# Always tear the port-forward down on exit (success or failure) so a failed run leaves nothing behind.
trap 'kill "$PF_PID" 2>/dev/null || true' EXIT

printf "Waiting for the admin endpoint to answer"
ready=false
for _ in $(seq 1 60); do
  # A dead port-forward can never become ready - fail fast instead of probing a corpse 60 times.
  if ! kill -0 "$PF_PID" 2>/dev/null; then
    echo
    echo "ERROR: the port-forward (pid $PF_PID) died before the admin endpoint became ready." >&2
    exit 1
  fi
  if curl -sf "http://localhost:$ADMIN_PORT/admin/v2/brokers/ready" >/dev/null 2>&1; then
    echo " ready."
    ready=true
    break
  fi
  printf "."
  sleep 2
done

if [ "$ready" != true ]; then
  echo
  echo "ERROR: the admin endpoint at http://localhost:$ADMIN_PORT did not become ready in time." >&2
  exit 1
fi

# Made it: hand the port-forward off to the foreground `wait` below; drop the kill-on-exit trap so
# the long-lived tunnel isn't torn down when the script's setup phase ends.
trap - EXIT

cat <<EOF

Cluster up (port-forward pid $PF_PID).
  PULSAR_ADMIN_URL=http://localhost:$ADMIN_PORT
  PULSAR_SERVICE_URL=pulsar://localhost:$BROKER_PORT

Teardown:  k3d cluster delete $K3D_CLUSTER
EOF
wait "$PF_PID"
