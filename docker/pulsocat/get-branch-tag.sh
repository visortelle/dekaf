#!/usr/bin/env bash

set -eo pipefail

git_branch=$( git rev-parse --abbrev-ref HEAD )
image_extra_tag="tealtools/pulsocat-dev:${git_branch}"

echo "${image_extra_tag}"
