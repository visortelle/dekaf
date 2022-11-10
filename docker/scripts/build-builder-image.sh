#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

docker_image_tag=$("${this_dir}/get-docker-image-tag.sh")

docker buildx build \
  --push \
  --progress plain \
  --platform linux/amd64 \
  -t $docker_image_tag \
  -f Dockerfile-builder \
  "${repo_dir}"
