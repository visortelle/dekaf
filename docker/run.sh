#!/usr/bin/env bash

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

image_tag=$("${this_dir}/get-tag.sh")

docker run -it -p 8090:8090 "$image_tag" "$@"
