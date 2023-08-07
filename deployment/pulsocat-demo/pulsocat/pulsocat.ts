import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const app = "ui";
const project = pulumi.getProject();
const stack = pulumi.getStack();
const appFqn = `${project}-${app}-${stack}`;

export const createResources = (props: { k8sProvider: k8s.Provider }) => {
  const namespace = new k8s.core.v1.Namespace(
    appFqn,
    {
      metadata: {
        name: appFqn,
        labels: {
          "istio-injection": "enabled"
        }
      }
    },
    {
      provider: props.k8sProvider
    }
  );

  const helmRelease = new k8s.helm.v3.Release(`${project}-${app}-${stack}`, {
    chart: "../../helm/pulsocat-helm",
    namespace: namespace.metadata.name,
    skipAwait: true,
    forceUpdate: true,
    values: {
      fullnameOverride: appFqn,
      nodeSelector: { purpose: "memory-optimized" }
    }
  }, {
    provider: props.k8sProvider,
    dependsOn: [namespace],
  });

  const gateway = new k8s.apiextensions.CustomResource(
    appFqn,
    {
      apiVersion: "networking.istio.io/v1beta1",
      kind: "Gateway",
      metadata: {
        name: appFqn,
        namespace: namespace.metadata.name
      },
      spec: {
        selector: {
          "istio": `ingressgateway`
        },
        servers: [
          {
            port: {
              number: 443,
              name: "https",
              protocol: "HTTPS"
            },
            hosts: [`${appFqn}.dev.teal.tools`],
            tls: {
              mode: "SIMPLE",
              credentialName: `wildcard.dev.teal.tools-tls`,
            }
          }
        ]
      }
    },
    { provider: props.k8sProvider, dependsOn: [helmRelease] }
  );

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
        hosts: ["*"],
        gateways: [gateway.metadata.name],
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
    { provider: props.k8sProvider, dependsOn: [helmRelease] }
  );

  return {
    namespace,
    helmRelease,
  };
}
