#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

docker_image_tag=$("${this_dir}/get-docker-image-tag.sh")

docker pull $docker_image_tag
docker run -it -v $repo_dir:/project $docker_image_tag
