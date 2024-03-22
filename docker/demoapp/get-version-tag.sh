#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

# If this is a public release, use the public repo.
# Otherwise, use the dev repo.
set +e
git --no-pager tag --contains | grep +* &>/dev/null
is_public_release=$?
if [ $is_public_release -eq 0 ]; then
  docker_repo="dekaf-demoapp"
else
  docker_repo="dekaf-demoapp-dev"
fi
set -ue

app_version=$(cd "${repo_dir}/demoapp" && sbt version 2>/dev/null | grep info | tail -n 1 | cut -d ' ' -f 2 | sed -e 's/\x1b\[[0-9;]*m//g')
echo "tealtools/${docker_repo}:${app_version}"
