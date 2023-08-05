#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

# If this is a public release, use the public repo.
# Otherwise, use the dev repo.
set +x
git describe --tags
is_public_release=$?
if [ $is_public_release -eq 0 ]; then
  docker_repo="pulsocat"
else
  docker_repo="pulsocat-dev"
fi
set -x

app_version=$(cd "${repo_dir}/server" && sbt version 2> /dev/null | grep info | tail -n 1 | cut -d ' ' -f 2 | sed -e 's/\x1b\[[0-9;]*m//g' )
echo "tealtools/${docker_repo}:${app_version}"
