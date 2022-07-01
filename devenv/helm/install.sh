#!/usr/bin/env bash

set -xeo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

ns="pulsar-devenv"
helm_release="pulsar-devenv"

rm -rf "${this_dir}/pulsar-helm-chart"
git clone --depth 1 https://github.com/apache/pulsar-helm-chart -b pulsar-2.9.2 --single-branch "${this_dir}/pulsar-helm-chart"
"${this_dir}/pulsar-helm-chart/scripts/pulsar/prepare_helm_release.sh" -n "${ns}" -k "${helm_release}"
rm -rf "${this_dir}/pulsar-helm-chart"

helm repo add apache https://pulsar.apache.org/charts

helm upgrade "${helm_release}" apache/pulsar --install --force -n "${ns}" -f "${this_dir}/values.yaml"
