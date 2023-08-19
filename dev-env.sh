export PULSOCAT_PORT="8090"
export PULSOCAT_PUBLIC_URL="http://localhost:8090"

export PULSOCAT_LIBRARY_PATH="./library"

export PULSOCAT_LICENSE_ID="db1fa160-7f2f-4bdf-b3f2-5e194d2af2f6"
export PULSOCAT_LICENSE_TOKEN="activ-44d2d91a3f7a41a0ff35d3d7936ffd8ev3"

export PULSOCAT_PULSAR_INSTANCE_NAME="StreamNative dev"

export PULSOCAT_PULSAR_INSTANCE_BROKER_SERVICE_URL="pulsar+ssl://cluster-d.o-xy6ek.snio.cloud:6651"
export PULSOCAT_PULSAR_INSTANCE_WEB_SERVICE_URL="https://cluster-d.o-xy6ek.snio.cloud"

pulimi_stack="tealtools/core-infra/prod"

function configure_kubectl() {
  tmp_dir=$(mktemp -d)
  kube_config_path="${tmp_dir}/kubeconfig.yml"
  cd "${this_dir}" && pulumi stack output -s ${pulimi_stack} kubeconfig >"${kube_config_path}"
  export KUBECONFIG="${kube_config_path}"
}

configure_kubectl

alias k="kubectl"
