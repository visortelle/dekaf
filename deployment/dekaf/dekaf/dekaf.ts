import * as pulumi from "@pulumi/pulumi";
import { execSync } from "child_process";
import * as k8s from "@pulumi/kubernetes";
import { mkIsPublicDemo } from "../shared/shared";

const app = "ui";
const project = pulumi.getProject();
const stack = pulumi.getStack();
const appFqn = `${project}-${app}-${stack}`;

const gitRev = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).toString().trim();
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).toString().trim();

const isPublicDemo = mkIsPublicDemo();
const host = isPublicDemo ? "dekaf.com" : `${appFqn}.dev.teal.tools`;

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
    chart: "oci://docker.io/tealtools/dekaf-helm-dev",
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
      dekaf: {
        image: {
          repository: "tealtools/dekaf-dev",
          pullPolicy: "Always",
          tag: gitBranch,
        },
        resources: {
          limits: {
            cpu: isPublicDemo ? "4000m" : "1000m",
            memory: isPublicDemo ? "16Gi" : "2Gi"
          },
          requests: {
            cpu: isPublicDemo ? "4000m" : "100m",
            memory: isPublicDemo ? "16Gi" : "512Mi",
          }
        },
        basePath: "/demo",
        config: {
          publicBaseUrl: `https://${host}/demo`,
          pulsarBrokerUrl: "pulsar+ssl://cluster-f.o-xy6ek.snio.cloud:6651",
          pulsarWebUrl: "https://cluster-f.o-xy6ek.snio.cloud",
        },
        env: [
          { name: "DEKAF_LICENSE_ID", value: "db1fa160-7f2f-4bdf-b3f2-5e194d2af2f6" },
          { name: "DEKAF_LICENSE_TOKEN", value: "activ-44d2d91a3f7a41a0ff35d3d7936ffd8ev3" },
          { name: "DEKAF_DEFAULT_PULSAR_AUTH", value: `{ "type": "oauth2", "issuerUrl": "https://auth.streamnative.cloud/", "privateKey": "data:application/json;base64,eyJ0eXBlIjoic25fc2VydmljZV9hY2NvdW50IiwiY2xpZW50X2lkIjoiYm5XT1M0STZ5dkRvSG93NEFjbU12UWpFUUdvTzRvQ1kiLCJjbGllbnRfc2VjcmV0IjoiaW1WekhvMERLSkdqejZBcWJCV0FZZ3ZlY0YxUEV0WmYtcUh4THhpQXBpMWxWVEhBVkh1MzRIZnBDNjlZc292aiIsImNsaWVudF9lbWFpbCI6ImFkbWluQG8teHk2ZWsuYXV0aC5zdHJlYW1uYXRpdmUuY2xvdWQiLCJpc3N1ZXJfdXJsIjoiaHR0cHM6Ly9hdXRoLnN0cmVhbW5hdGl2ZS5jbG91ZC8ifQ==", "audience": "urn:sn:pulsar:o-xy6ek:instance-f" }` },
        ]
      },
      monitoring: {
        scrapeConfigsSecret: {
          value: `
- job_name: pulsar
  metrics_path: /cloud/metrics/export
  scheme: https
  oauth2:
    client_id: "bnWOS4I6yvDoHow4AcmMvQjEQGoO4oCY"
    client_secret: "imVzHo0DKJGjz6AqbBWAYgvecF1PEtZf-qHxLxiApi1lVTHAVHu34HfpC69Ysovj"
    token_url: https://auth.streamnative.cloud/oauth/token
    endpoint_params:
      grant_type: "client_credentials"
      audience: "urn:sn:pulsar:o-xy6ek:instance-f"
  static_configs:
  - targets: [metrics.streamnative.cloud]
`
        },
        prometheus: {
          extraSpec: {
            storage: {
              volumeClaimTemplate: {
                spec: {
                  storageClassName: "gp2",
                  resources: {
                    requests: {
                      storage: "100Gi"
                    }
                  }
                }
              }
            },
            securityContext: {
              fsGroup: 2000,
              runAsNonRoot: true,
              runAsUser: 1000
            }
          }
        }
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
        hosts: [host],
        gateways: [
          isPublicDemo ?
            "istio-system/dekaf-com" :
            `istio-system/wildcard-dev-teal-tools`
        ],
        http: [
          {
            match: [{ uri: { prefix: "/demo" } }],
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
