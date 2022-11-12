#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

docker_image_tag=$("${this_dir}/get-tag.sh")

builder_image_tag=$("${this_dir}/../builder/get-tag.sh")
docker pull $builder_image_tag

docker build \
  --pull \
  --progress plain \
  -t $docker_image_tag \
  -f app/Dockerfile \
  "${repo_dir}"
