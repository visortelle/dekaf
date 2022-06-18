#!/usr/bin/env bash

api_url="http://localhost:8080/admin/v2"

tenants_count=100
namespaces_count=100

for te in $(seq $tenants_count); do
  curl -X PUT \
    -H 'Content-Type: application/json' \
    -d '{"allowedClusters": ["standalone"], "adminRoles": [""]}' \
    "${api_url}/tenants/tenant-$te" &
done

for te in $(seq $tenants_count); do
  for ns in $(seq $namespaces_count); do
    curl -X PUT \
      -H 'Content-Type: application/json' \
      "${api_url}/namespaces/tenant-${te}/namespace-$ns" &
  done
done
