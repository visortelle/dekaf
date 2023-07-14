#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_tag=$("${this_dir}/get-tag.sh")
image_extra_tag=$("${this_dir}/get-extra-tag.sh")

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

docker push $image_tag
docker push $image_extra_tag
