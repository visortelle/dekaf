#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

app_version=$(cd "${repo_dir}/demoapp" && sbt version 2>/dev/null | grep info | tail -n 1 | cut -d ' ' -f 2 | sed -e 's/\x1b\[[0-9;]*m//g')
echo "tealtools/pulsocat-demoapp:${app_version}"
