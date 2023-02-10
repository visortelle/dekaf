#!/usr/bin/env bash

set -x

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

ns="pulsar-devenv"
helm_release="pulsar-devenv"

helm delete -n "${ns}" "${helm_release}" || true
kubectl get secrets -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete secrets -n ${ns}

kubectl get pv -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch pv -n ${ns} -p '{"metadata":{"finalizers":null}}'
kubectl get pv -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete pv -n ${ns} --grace-period=0 --force

kubectl get pvc -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch pvc -n ${ns} -p '{"metadata":{"finalizers":null}}'
kubectl get pvc -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete pvc -n ${ns} --grace-period=0 --force

kubectl delete namespace --force --wait=false "${ns}" || true
"${this_dir}/force-delete-namespaces.sh"
