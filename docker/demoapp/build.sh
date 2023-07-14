#!/usr/bin/env bash

set -xeo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_tag=$("${this_dir}/get-tag.sh")

docker build \
  --pull \
  --progress plain \
  -t $image_tag \
  -f "${this_dir}/Dockerfile" \
  "${repo_dir}"
