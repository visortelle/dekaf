#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_tag=$("${this_dir}/get-tag.sh")
image_extra_tag=$("${this_dir}/get-extra-tag.sh")

docker build \
  --pull \
  --progress plain \
  -t $image_tag \
  -t $image_extra_tag \
  -f "${this_dir}/Dockerfile" \
  "${repo_dir}"
