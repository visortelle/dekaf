#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_version_tag=$("${this_dir}/get-version-tag.sh")
image_branch_tag=$("${this_dir}/get-branch-tag.sh")

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  --pull \
  --progress plain \
  -t "${image_branch_tag}" \
  -t "${image_version_tag}" \
  -f "${this_dir}/Dockerfile" \
  "${repo_dir}"
