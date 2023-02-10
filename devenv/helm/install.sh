#!/usr/bin/env bash

set -xeo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

helm repo add apache https://pulsar.apache.org/charts

ns="pulsar-devenv"
helm_release="pulsar-devenv"

set +e;
kubectl get namespace "${ns}" &>/dev/null;
exit_code=$?
set -e;
is_fresh_install=$(if [[ "$exit_code" -eq 0 ]]; then echo "false"; else echo "true"; fi)
echo "Is fresh install? ${is_fresh_install}"

"${this_dir}/prepare_helm_release.sh" -n "${ns}" -c -k "${helm_release}" --pulsar-superusers 'admin-1,admin-2'

helm \
  upgrade "${helm_release}" apache/pulsar \
  --install \
  --force \
  --set initialize="${is_fresh_install}" \
  --set clusterName="${helm_release}" \
  --version "3.0.0" \
  -n "${ns}" \
  -f "${this_dir}/values.yaml"
