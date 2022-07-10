#!/usr/bin/env bash

set -xeo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

ns="pulsar-devenv"
helm_release="pulsar-devenv"

rm -rf "${this_dir}/pulsar-helm-chart"
git clone --depth 1 https://github.com/tealtools/pulsar-helm-chart -b tealtools-fixes --single-branch "${this_dir}/pulsar-helm-chart"
"${this_dir}/pulsar-helm-chart/scripts/pulsar/prepare_helm_release.sh" -n "${ns}" -k "${helm_release}"

helm upgrade "${helm_release}" "${this_dir}/pulsar-helm-chart/charts/pulsar" --install --force -n "${ns}" -f "${this_dir}/values.yaml"

rm -rf "${this_dir}/pulsar-helm-chart"
