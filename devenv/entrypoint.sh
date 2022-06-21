#!/usr/bin/env bash
set -eo pipefail

cases_dir=/cases
pulsar_conf_dir=/pulsar/conf
broker_conf_path="${pulsar_conf_dir}/standalone.conf"

case_name=$1
echo "Case name: ${case_name}"

case_broker_conf_path="${cases_dir}/${case_name}/broker.conf"
if test -f "${case_broker_conf_path}"; then
  echo "Using broker.conf from ${case_name}"
  echo "" >>"${broker_conf_path}"
  cat "${case_broker_conf_path}" >>"${broker_conf_path}"
fi

case_entrypoint_path="${cases_dir}/${case_name}/entrypoint.sh"
if test -f "${case_entrypoint_path}"; then
  echo "Running entrypoint.sh for ${case_name}"
  $case_entrypoint_path
fi

case_populate_path="${cases_dir}/${case_name}/populate.sh"
if test -f "${case_populate_path}"; then
  echo "Running populate.sh for ${case_name} in background"
  (sleep 60 && $case_populate_path) &
fi

echo "Starting Pulsar..."
bin/pulsar standalone
