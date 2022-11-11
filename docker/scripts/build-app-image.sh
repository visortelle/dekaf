#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

docker_image_tag=$("${this_dir}/get-app-docker-image-tag.sh")

docker buildx build \
  --push \
  --progress plain \
  --platform linux/amd64,linux/arm64 \
  -t $docker_image_tag \
  -f Dockerfile-app \
  "${repo_dir}"
