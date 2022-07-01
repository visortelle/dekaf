#!/usr/bin/env bash

set -xeo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

ns="pulsar-devenv"
helm_release="pulsar-devenv"

helm delete "${helm_release}" || true
kubectl delete namespace --force --wait=false "${ns}" || true
"${this_dir}/force-delete-namespaces.sh"

kubectl create namespace "${ns}"
