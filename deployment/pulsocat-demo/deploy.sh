#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

cd "${this_dir}" && npm ci

git_branch=$(git rev-parse --short=8 HEAD)
echo "${git_branch}" | iconv -t ascii//TRANSLIT | sed -E s/[^a-zA-Z0-9]+/-/g | sed -E s/^-+\|-+$//g | tr A-Z a-z

echo "Deploying to Pulumi stack: ${git_branch}"
pulumi_stack="${git_branch}"

echo "Configuring kubeconfig."
aws --no-cli-pager sts get-caller-identity
aws eks update-kubeconfig --region $EKS_CLUSTER_REGION --name $EKS_CLUSTER_NAME

echo "Logging into Helm OCI registry."
echo $DOCKER_PASS | helm registry login --password-stdin --username $DOCKER_USER docker.io

pulumi stack select --create $pulumi_stack
pulumi up --stack $pulumi_stack --yes --skip-preview --non-interactive
