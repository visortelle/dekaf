#!/usr/bin/env bash

set -x

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

function clean() {
  local ns=$1
  local helm_release=$ns

  kubectl get secrets -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete secrets -n ${ns}

  kubectl get job -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch job -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get job -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete job -n ${ns} --grace-period=0 --force --wait=false

  kubectl get daemonset -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch daemonset -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get daemonset -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete daemonset -n ${ns} --grace-period=0 --force --wait=false

  kubectl get deployment -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch deployment -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get deployment -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete deployment -n ${ns} --grace-period=0 --force --wait=false

  kubectl get statefulset -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch statefulset -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get statefulset -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete statefulset -n ${ns} --grace-period=0 --force --wait=false

  kubectl get pod -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch pod -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get pod -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete pod -n ${ns} --grace-period=0 --force --wait=false

  kubectl get svc -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch svc -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get svc -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete svc -n ${ns} --grace-period=0 --force --wait=false

  kubectl get pv -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch pv -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get pv -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete pv -n ${ns} --grace-period=0 --force --wait=false

  kubectl get pvc -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl patch pvc -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl get pvc -n ${ns} -o json | jq -r '.items[] | .metadata.name' | xargs kubectl delete pvc -n ${ns} --grace-period=0 --force --wait=false

  helm delete -n "${ns}" "${helm_release}" || true

  kubectl patch namespace -n ${ns} -p '{"metadata":{"finalizers":null}}'
  kubectl delete namespace --force --wait=false "${ns}" || true

  "${this_dir}/force-delete-namespaces.sh"
}

clean "pulsar-devenv"
