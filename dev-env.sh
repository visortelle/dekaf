export PULSOCAT_LICENSE_ID="db1fa160-7f2f-4bdf-b3f2-5e194d2af2f6"
export PULSOCAT_LICENSE_TOKEN="activ-44d2d91a3f7a41a0ff35d3d7936ffd8ev3"

export PULSOCAT_PULSAR_BROKER_URL="pulsar+ssl://cluster-f.o-xy6ek.snio.cloud:6651"
export PULSOCAT_PULSAR_HTTP_URL="https://cluster-f.o-xy6ek.snio.cloud"

export PULSOCAT_DEFAULT_PULSAR_AUTH='{ "type": "oauth2", "issuerUrl": "https://auth.streamnative.cloud/", "privateKey": "data:application/json;base64,eyJ0eXBlIjoic25fc2VydmljZV9hY2NvdW50IiwiY2xpZW50X2lkIjoiYm5XT1M0STZ5dkRvSG93NEFjbU12UWpFUUdvTzRvQ1kiLCJjbGllbnRfc2VjcmV0IjoiaW1WekhvMERLSkdqejZBcWJCV0FZZ3ZlY0YxUEV0WmYtcUh4THhpQXBpMWxWVEhBVkh1MzRIZnBDNjlZc292aiIsImNsaWVudF9lbWFpbCI6ImFkbWluQG8teHk2ZWsuYXV0aC5zdHJlYW1uYXRpdmUuY2xvdWQiLCJpc3N1ZXJfdXJsIjoiaHR0cHM6Ly9hdXRoLnN0cmVhbW5hdGl2ZS5jbG91ZC8ifQ==", "audience": "urn:sn:pulsar:o-xy6ek:instance-f" }'

# Don't remove the following basepath-related lines, they are usefull for testing in dev
# export PULSOCAT_PUBLIC_BASE_URL="http://localhost:8090/demo"
# export PULSOCAT_BASE_PATH="/demo"

function configure_kubectl() {
  tmp_dir=$(mktemp -d)
  kube_config_path="${tmp_dir}/kubeconfig.yml"
  pulumi_stack="tealtools/core-infra/prod"
  cd "${this_dir}" && pulumi stack output -s ${pulumi_stack} kubeconfig >"${kube_config_path}"
  export KUBECONFIG="${kube_config_path}"
}

configure_kubectl

alias k="kubectl"
