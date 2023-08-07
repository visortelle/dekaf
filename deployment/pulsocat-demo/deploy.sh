#!/usr/bin/env bash

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

cd "${this_dir}" && npm ci

git_branch=$(git rev-parse --abbrev-ref HEAD)
echo "${git_branch}" | iconv -t ascii//TRANSLIT | sed -E s/[^a-zA-Z0-9]+/-/g | sed -E s/^-+\|-+$//g | tr A-Z a-z

echo "Deploying to Pulumi stack: ${git_branch}"
pulumi_stack="${git_branch}"

echo $DOCKER_PASS | helm registry login --password-stdin --username $DOCKER_USER docker.io

pulumi stack select --create $pulumi_stack
pulumi up --stack $pulumi_stack --yes --skip-preview --non-interactive
