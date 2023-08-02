export PULSOCAT_LICENSE_ID="db1fa160-7f2f-4bdf-b3f2-5e194d2af2f6"
export PULSOCAT_LICENSE_TOKEN="activ-44d2d91a3f7a41a0ff35d3d7936ffd8ev3"

export PULSOCAT_PULSAR_BROKER_URL="pulsar+ssl://cluster-d.o-xy6ek.snio.cloud:6651"
export PULSOCAT_PULSAR_HTTP_URL="https://cluster-d.o-xy6ek.snio.cloud"

export PULSAR_CLUSTER="test2"
export GRAFANA_DOMAIN="localhost:8090"

export PROMETHEUS_CONFIG_FILE="cluster.yml.template"

function configure_kubectl() {
  tmp_dir=$(mktemp -d)
  kube_config_path="${tmp_dir}/kubeconfig.yml"
  pulumi_stack="tealtools/core-infra/prod"
  cd "${this_dir}" && pulumi stack output -s ${pulumi_stack} kubeconfig >"${kube_config_path}"
  export KUBECONFIG="${kube_config_path}"
}

configure_kubectl

alias k="kubectl"
