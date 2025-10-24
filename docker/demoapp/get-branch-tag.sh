#!/usr/bin/env bash

set -ueo pipefail

git_branch=$(git rev-parse --abbrev-ref HEAD)
branch_tag="visortelle/dekaf-demoapp:${git_branch}"

echo "${branch_tag}"
