#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

app_version=$(cd "${repo_dir}/demoapp" && sbt version 2> /dev/null | tail -n 1 | cut -d ' ' -f 2)
echo "tesltools/pulsocat-demoapp:${app_version}"
