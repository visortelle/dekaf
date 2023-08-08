#!/usr/bin/env bash

set -ueo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

is_node_modules_present=$(ls -d "${this_dir}/node_modules" || true)
if [ -z "$is_node_modules_present" ]; then
  echo "Installing dependencies."
  cd "${this_dir}" && npm ci
fi

git_branch=$(git rev-parse --abbrev-ref HEAD)
echo "${git_branch}" | iconv -t ascii//TRANSLIT | sed -E s/[^a-zA-Z0-9]+/-/g | sed -E s/^-+\|-+$//g | tr A-Z a-z

echo "Deploying to Pulumi stack: ${git_branch}"
pulumi_stack="${git_branch}"

echo "Configuring kubeconfig."
aws --no-cli-pager sts get-caller-identity
aws eks update-kubeconfig --region $EKS_CLUSTER_REGION --name $EKS_CLUSTER_NAME

echo "Logging into Helm OCI registry."
echo $DOCKER_PASS | helm registry login --password-stdin --username $DOCKER_USER docker.io

pulumi stack select --create $pulumi_stack
pulumi refresh --yes --stack $pulumi_stack
pulumi up --stack $pulumi_stack --yes --skip-preview --non-interactive
