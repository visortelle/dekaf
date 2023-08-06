#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

echo $DOCKER_PASS | helm registry login --password-stdin --username $DOCKER_USER registry-1.docker.io

rm -rf "${this_dir}/*.tgz"
helm package "${this_dir}/pulsocat"

chart_package=$(ls -1 *.tgz | head -n 1)

helm push $chart_package oci://registry-1.docker.io/tealtools
