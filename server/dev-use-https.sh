#!/usr/bin/env bash

this_dir=$(cd $(dirname $0) && pwd)
mkdir -p "${this_dir}/tmp"

set -eo pipefail

# Run source ./dev-use-https.sh before running sbg to enable https for dekaf during development

key_path="${this_dir}/tmp/dekaf.key"
crt_path="${this_dir}/tmp/dekaf.crt"
csr_path="${this_dir}/tmp/dekaf.csr"

openssl genrsa -out $key_path 2048
openssl req -new -key $key_path -out $csr_path -subj "/C=CN/ST=US/L=US/O=localhost/OU=localhost/CN=localhost"
openssl x509 -req -days 365 -in $csr_path -signkey $key_path -out $crt_path

export DEKAF_PROTOCOL="https"
export DEKAF_TLS_CERTIFICATE_FILE_PATH="${crt_path}"
export DEKAF_TLS_KEY_FILE_PATH="${key_path}"
export DEKAF_PUBLIC_BASE_URL="https://localhost:8090"
