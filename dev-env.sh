this_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

export DEKAF_LICENSE_ID="db1fa160-7f2f-4bdf-b3f2-5e194d2af2f6"
export DEKAF_LICENSE_TOKEN="activ-b8240503c17c1c70508dad0444ffc014v3"
# dekaf-for-teams-dev activ-b8240503c17c1c70508dad0444ffc014v3
# dekaf-desktop-dev activ-36faa778fa03d3aa0eae4953458d32cev3

# export DEKAF_PULSAR_BROKER_URL="pulsar+ssl://cluster-f.o-xy6ek.snio.cloud:6651"
# export DEKAF_PULSAR_WEB_URL="https://cluster-f.o-xy6ek.snio.cloud"

# export DEKAF_DEFAULT_PULSAR_AUTH='{ "type": "oauth2", "issuerUrl": "https://auth.streamnative.cloud/", "privateKey": "data:application/json;base64,eyJ0eXBlIjoic25fc2VydmljZV9hY2NvdW50IiwiY2xpZW50X2lkIjoiYm5XT1M0STZ5dkRvSG93NEFjbU12UWpFUUdvTzRvQ1kiLCJjbGllbnRfc2VjcmV0IjoiaW1WekhvMERLSkdqejZBcWJCV0FZZ3ZlY0YxUEV0WmYtcUh4THhpQXBpMWxWVEhBVkh1MzRIZnBDNjlZc292aiIsImNsaWVudF9lbWFpbCI6ImFkbWluQG8teHk2ZWsuYXV0aC5zdHJlYW1uYXRpdmUuY2xvdWQiLCJpc3N1ZXJfdXJsIjoiaHR0cHM6Ly9hdXRoLnN0cmVhbW5hdGl2ZS5jbG91ZC8ifQ==", "audience": "urn:sn:pulsar:o-xy6ek:instance-f" }'

# Don't remove the following basepath-related lines, they are usefull for testing in dev
# export DEKAF_PUBLIC_BASE_URL="http://localhost:8090/demo"
# export DEKAF_BASE_PATH="/demo"

export TEST_IS_USE_EXISTING_PULSAR=true
export TEST_IS_OPEN_BROWSER=true

function add_binary_dependencies_to_path() {
  set -e
  bin_dir=$( $this_dir/bin/get-bin-dir.js )

  export PATH="${PATH}:${bin_dir}"
  set +e
}

function configure_kubectl() {
  tmp_dir=$(mktemp -d)
  kube_config_path="${tmp_dir}/kubeconfig.yml"
  pulumi_stack="tealtools/core-infra/prod"
  cd "${this_dir}" && pulumi stack output -s ${pulumi_stack} kubeconfig >"${kube_config_path}"
  export KUBECONFIG="${kube_config_path}"
}

add_binary_dependencies_to_path
configure_kubectl

alias k="kubectl"
