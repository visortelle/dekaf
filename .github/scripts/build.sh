#!/usr/bin/env bash

set -eo pipefail

this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=${this_dir}/../..

pulsar_version="2.11.0"
wget -O /tmp/apache-pulsar-client.deb "https://archive.apache.org/dist/pulsar/pulsar-${pulsar_version}/DEB/apache-pulsar-client.deb"
wget -O /tmp/apache-pulsar-client-dev.deb "https://archive.apache.org/dist/pulsar/pulsar-${pulsar_version}/DEB/apache-pulsar-client-dev.deb"
apt install -y /tmp/apache-pulsar-client.deb
apt install -y /tmp/apache-pulsar-client-dev.deb

cd "${repo_dir}/ui" && npm ci
