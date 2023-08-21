import * as pulumi from "@pulumi/pulumi";
import { execSync } from "child_process";
import * as k8s from "@pulumi/kubernetes";

const app = "ui";
const project = pulumi.getProject();
const stack = pulumi.getStack();
const appFqn = `${project}-${app}-${stack}`;

const gitRev = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).toString().trim();
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).toString().trim();

export const createResources = () => {
  const namespace = new k8s.core.v1.Namespace(
    appFqn,
    {
      metadata: {
        name: appFqn,
        labels: {
          "istio-injection": "enabled"
        }
      },
    }
  );

  const helmRelease = new k8s.helm.v3.Release(`${project}-${app}-${stack}`, {
    chart: "oci://docker.io/tealtools/pulsocat-helm-dev",
    version: `0.0.0-${gitRev}`,
    namespace: namespace.metadata.name,
    skipAwait: true,
    forceUpdate: true,
    createNamespace: false,
    name: appFqn,
    replace: true,
    values: {
      fullnameOverride: appFqn,
      nodeSelector: { purpose: "memory-optimized" },
      imagePullSecrets: [{ name: "image-pull-secret" }],
      pulsocat: {
        image: {
          repository: "tealtools/pulsocat-dev",
          pullPolicy: "Always",
          tag: gitBranch,
        },
        env: [
          { name: "PULSOCAT_PUBLIC_URL", value: `https://${appFqn}.dev.teal.tools` },
          { name: "PULSOCAT_LICENSE_ID", value: "db1fa160-7f2f-4bdf-b3f2-5e194d2af2f6" },
          { name: "PULSOCAT_LICENSE_TOKEN", value: "activ-44d2d91a3f7a41a0ff35d3d7936ffd8ev3" },
          { name: "PULSOCAT_PULSAR_BROKER_URL", value: "pulsar+ssl://cluster-d.o-xy6ek.snio.cloud:6651" },
          { name: "PULSOCAT_PULSAR_HTTP_URL", value: "https://cluster-d.o-xy6ek.snio.cloud" },
        ]
      }
    }
  }, {
    dependsOn: [namespace],
  });

  const virtualService = new k8s.apiextensions.CustomResource(
    appFqn,
    {
      apiVersion: "networking.istio.io/v1beta1",
      kind: "VirtualService",
      metadata: {
        name: appFqn,
        namespace: namespace.metadata.name,
      },
      spec: {
        hosts: [`${appFqn}.dev.teal.tools`],
        gateways: [`istio-system/wildcard-dev-teal-tools`],
        http: [
          {
            match: [{ uri: { prefix: "/" } }],
            route: [
              {
                destination: {
                  port: { number: 80 },
                  host: appFqn
                }
              }
            ]
          }
        ]
      }
    },
    { dependsOn: [helmRelease] }
  );

  return {
    namespace,
    helmRelease,
  };
}
