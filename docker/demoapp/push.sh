#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_tag=$("${this_dir}/get-tag.sh")
image_extra_tag=$("${this_dir}/get-extra-tag.sh")

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

docker manifest create \
	$image_tag \
	--amend "${image_tag}-arm64" \
	--amend "${image_tag}-amd64"

docker manifest create \
	$image_extra_tag \
	--amend "${image_tag}-arm64" \
	--amend "${image_tag}-amd64"

docker push $image_tag
docker push $image_extra_tag
