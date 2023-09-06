import * as pulumi from "@pulumi/pulumi";
import { execSync } from "child_process";
import * as k8s from "@pulumi/kubernetes";

const app = "demoapp";
const project = pulumi.getProject();
const stack = pulumi.getStack();
const appFqn = `${project}-${app}-${stack}`;

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

  const demoappConfig = new k8s.core.v1.ConfigMap(
    `${appFqn}-config`,
    {
      metadata: {
        name: `${appFqn}-config`,
        namespace: namespace.metadata.name,
      },
      data: {
        "config.yaml": JSON.stringify({
          brokerServiceUrl: "pulsar+ssl://cluster-f.o-xy6ek.snio.cloud:6651",
          webServiceUrl: "https://cluster-f.o-xy6ek.snio.cloud",
          auth: {
            oauth2: {
              issuerUrl: "https://auth.streamnative.cloud/",
              audience: "urn:sn:pulsar:o-xy6ek:instance-f",
              privateKey: `file:///private-key.json`
            }
          },
        }, null, 2),
        "private-key.json": `{"type":"sn_service_account","client_id":"bnWOS4I6yvDoHow4AcmMvQjEQGoO4oCY","client_secret":"imVzHo0DKJGjz6AqbBWAYgvecF1PEtZf-qHxLxiApi1lVTHAVHu34HfpC69Ysovj","client_email":"admin@o-xy6ek.auth.streamnative.cloud","issuer_url":"https://auth.streamnative.cloud/"}`
      }
    }
  );

  const demoappDeployment = new k8s.apps.v1.Deployment(
    appFqn,
    {
      metadata: {
        name: appFqn,
        namespace: namespace.metadata.name,
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: appFqn,
          }
        },
        template: {
          metadata: {
            labels: {
              app: appFqn,
            },
          },
          spec: {
            containers: [{
              name: appFqn,
              image: `tealtools/pulsocat-demoapp:${gitBranch}`,
              imagePullPolicy: "Always",
              volumeMounts: [{
                name: demoappConfig.metadata.name,
                mountPath: "/workdir/config.yaml",
                subPath: "config.yaml",
              }, {
                name: demoappConfig.metadata.name,
                mountPath: "/private-key.json",
                subPath: "private-key.json",
              }],
              resources: {
                limits: {
                  cpu: "4000m",
                  memory: "32Gi"
                },
                requests: {
                  cpu: "2000m",
                  memory: "16Gi",
                }
              },
            }],
            volumes: [{
              name: `${appFqn}-config`,
              configMap: {
                name: demoappConfig.metadata.name,
                items: [{
                  key: "config.yaml",
                  path: "config.yaml",
                }, {
                  key: "private-key.json",
                  path: "private-key.json",
                }]
              }
            }],
          }
        }
      }
    },
    {
      dependsOn: [namespace],
    }
  );

  return {
    namespace
  };
}
