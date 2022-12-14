#!/usr/bin/env bash
set -eo pipefail

pulsar_conf_dir=/pulsar/conf
broker_conf_append_path="/broker.conf.append"
broker_conf_path="${pulsar_conf_dir}/standalone.conf"

cat ${broker_conf_append_path} >> ${broker_conf_path}

echo "Starting Pulsar..."
bin/pulsar standalone
