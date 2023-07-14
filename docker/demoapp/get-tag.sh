#!/usr/bin/env bash

set -xeo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

app_version=$(cd "${repo_dir}/demoapp" && sbt version 2> /dev/null | tail -n 1 | cut -d ' ' -f 2)
echo "app_version-${app_version}"
tag="tealtools/pulsocat-demoapp:${app_version}"
echo "${tag}"
