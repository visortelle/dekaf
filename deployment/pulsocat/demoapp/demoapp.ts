import * as pulumi from "@pulumi/pulumi";
import { execSync } from "child_process";
import * as k8s from "@pulumi/kubernetes";
import { mkIsPublicDemo } from "../shared/shared";

const app = "demoapp";
const project = pulumi.getProject();
const stack = pulumi.getStack();
const appFqn = `${project}-${app}-${stack}`;

const gitRev = execSync('git rev-parse --short=8 HEAD', { encoding: 'utf-8' }).toString().trim();
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).toString().trim();

const isPublicDemo = mkIsPublicDemo();

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

  const privateKey = `{"type":"sn_service_account","client_id":"bnWOS4I6yvDoHow4AcmMvQjEQGoO4oCY","client_secret":"imVzHo0DKJGjz6AqbBWAYgvecF1PEtZf-qHxLxiApi1lVTHAVHu34HfpC69Ysovj","client_email":"admin@o-xy6ek.auth.streamnative.cloud","issuer_url":"https://auth.streamnative.cloud/"}`;

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
            issuerUrl: "https://auth.streamnative.cloud/",
            audience: "urn:sn:pulsar:o-xy6ek:instance-f",
            privateKey: `data:application/json;base64,${btoa(privateKey)}`
          },
        }, null, 2),
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
              volumeMounts: [{
                name: `${appFqn}-config`,
                mountPath: "/workdir/",
              }],
              resources: {
                limits: {
                  cpu: "4000m",
                  memory: "32Gi"
                },
                requests: {
                  cpu: "4000m",
                  memory: "32Gi",
                }
              },
            }],
            volumes: [{
              name: `${appFqn}-config`,
              configMap: {
                name: demoappConfig.metadata.name,
              }
            }],
          }
        }
      }
    },
    {
      dependsOn: [namespace]
    }
  );

  return {
    namespace
  };
}
