#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

echo $DOCKER_PASS | docker login --password-stdin --username $DOCKER_USER

# When DEKAF_IMAGE_TAG is set (by .github/workflows/release.yml) push that single
# explicit release/preview tag. Otherwise fall back to the default branch tag +
# git-described version tag (see get-branch-tag.sh / get-version-tag.sh).
if [ -n "${DEKAF_IMAGE_TAG:-}" ]; then
  tags=(-t "${DEKAF_IMAGE_TAG}")
else
  tags=(-t "$("${this_dir}/get-branch-tag.sh")" -t "$("${this_dir}/get-version-tag.sh")")
fi

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --pull \
  --progress plain \
  "${tags[@]}" \
  --push \
  -f "${this_dir}/Dockerfile" \
  "${repo_dir}"
