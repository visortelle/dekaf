#!/usr/bin/env bash

api_url="http://localhost:8080/admin/v2"

tenants_count=1000
namespaces_count=10
topics_count=100

for te in $(seq $tenants_count); do
  curl -X PUT \
    -H 'Content-Type: application/json' \
    -d '{"allowedClusters": ["standalone"], "adminRoles": [""]}' \
    "${api_url}/tenants/tenant-${te}"
done

for te in $(seq $tenants_count); do
  for ns in $(seq $namespaces_count); do
    curl -X PUT \
      -H 'Content-Type: application/json' \
      "${api_url}/namespaces/tenant-${te}/namespace-${ns}"
  done
done

for te in $(seq $tenants_count); do
  for ns in $(seq $namespaces_count); do
    for to in $(seq $topics_count); do
      curl -X PUT \
        -H 'Content-Type: application/json' \
        "${api_url}/persistent/tenant-${te}/namespace-${ns}/topic-${to}"
    done
  done
done
