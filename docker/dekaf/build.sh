#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_version_tag=$("${this_dir}/get-version-tag.sh")
image_branch_tag=$("${this_dir}/get-branch-tag.sh")

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

is_arm64=$(uname -m | grep aarch64 || true)
if [ -z "$is_arm64" ]; then
  tag_suffix="-amd64"
else
  tag_suffix="-arm64"
fi

tag_1="${image_branch_tag}${tag_suffix}"
tag_2="${image_version_tag}${tag_suffix}"

docker build \
  --pull \
  --progress plain \
  -t $tag_1 \
  -f "${this_dir}/Dockerfile" \
  "${repo_dir}"

slim build --continue-after 1 --http-probe=false --include-path /dekaf --tag $tag_1 $tag_1
docker tag $tag_1 $tag_2

docker push $tag_1
docker push $tag_2
