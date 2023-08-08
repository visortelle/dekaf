#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

image_version_tag=$("${this_dir}/get-version-tag.sh")
image_branch_tag=$("${this_dir}/get-branch-tag.sh")

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

docker manifest create \
  $image_branch_tag \
  --amend "${image_branch_tag}-arm64" \
  --amend "${image_branch_tag}-amd64"

docker manifest create \
  $image_version_tag \
  --amend "${image_version_tag}-arm64" \
  --amend "${image_version_tag}-amd64"

docker manifest push $image_branch_tag
docker manifest push $image_version_tag

git_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$git_branch" == "main" ]; then
  docker manifest create \
    tealtools/pulsocat:latest \
    --amend "${image_version_tag}-arm64" \
    --amend "${image_version_tag}-amd64"

  docker manifest push tealtools/pulsocat:latest
fi
