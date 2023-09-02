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
              resources: {
                limits: {
                  cpu: "4000m",
                  memory: "32Gi"
                },
                requests: {
                  cpu: "4000m",
                  memory: "32Gi",
                }
              }
            }]
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
