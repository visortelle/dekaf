#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_version_tag=$("${this_dir}/get-version-tag.sh")
image_branch_tag=$("${this_dir}/get-branch-tag.sh")

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

tag_1="${image_branch_tag}"
tag_2="${image_version_tag}"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --pull \
  --progress plain \
  -t $tag_1 \
  -t $tag_2 \
  --push \
  -f "${this_dir}/Dockerfile" \
  "${repo_dir}"
