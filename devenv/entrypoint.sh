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

echo "Starting Pulsar..."
bin/pulsar standalone
