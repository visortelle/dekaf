#!/usr/bin/env bash

set -e
set -o pipefail

kubectl proxy &
proxy_pid="$!"
trap 'kill "$proxy_pid"' EXIT

for ns in $(kubectl get namespace --field-selector=status.phase=Terminating --output=jsonpath="{.items[*].metadata.name}"); do
    echo "Removing finalizers from namespace '$ns'..."
    curl -H "Content-Type: application/json" -X PUT "127.0.0.1:8001/api/v1/namespaces/$ns/finalize" -d @- \
        < <(kubectl get namespace "$ns" --output=json | jq '.spec = { "finalizers": [] }')

    echo
    echo "Force-deleting namespace '$ns'..."
    kubectl delete namespace "$ns" --force --grace-period=0 --ignore-not-found=true
done
