#!/usr/bin/env bash

set -eo pipefail

git_branch=$( git rev-parse --short=8 HEAD )
image_extra_tag="tealtools/pulsocat-demoapp:${git_branch}"

echo "${image_extra_tag}"
