import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const app = "grafana";
const project = pulumi.getProject();
const stack = pulumi.getStack();
const appFqn = `${project}-${app}-${stack}`;

// How to setup scrape Prometheus metrics in StreamNative cloud:
// https://docs.streamnative.io/docs/cloud-metrics-api

export const createResources = (props: { namespace: k8s.core.v1.Namespace }) => {
  const prometheusConfigmap = new k8s.core.v1.ConfigMap(`${appFqn}-prometheus`, {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      labels: {
        component: "server",
        app: "prometheus",
      },
      name: "prometheus",
      namespace: props.namespace.metadata.name,
    },
    data: {
      "allow-snippet-annotations": "false",
      "alerting_rules.yml": "{}",
      alerts: "{}",
      "prometheus.yml": `
    global:
      evaluation_interval: 1m
      scrape_interval: 15s
      scrape_timeout: 10s
    scrape_configs:
      - job_name: streamnative
        metrics_path: /cloud/metrics/export
        scheme: https
        oauth2:
          client_id: "bnWOS4I6yvDoHow4AcmMvQjEQGoO4oCY"
          client_secret: "imVzHo0DKJGjz6AqbBWAYgvecF1PEtZf-qHxLxiApi1lVTHAVHu34HfpC69Ysovj"
          token_url: "https://auth.streamnative.cloud/oauth/token"
          endpoint_params:
            grant_type: "client_credentials"
            audience: "urn:sn:pulsar:o-xy6ek:instance-f"
        static_configs:
        - targets: [metrics.streamnative.cloud]
`,
      "recording_rules.yml": "{}",
      rules: "{}",
    },
  });

  const prometheusService = new k8s.core.v1.Service(`${appFqn}-prometheus`, {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      labels: {
        app: "prometheus",
      },
      name: "prometheus",
      namespace: props.namespace.metadata.name,
    },
    spec: {
      ports: [{
        name: "http",
        port: 9090,
        protocol: "TCP",
        targetPort: 9090,
      }],
      selector: {
        component: "server",
        app: "prometheus",
      },
      sessionAffinity: "None",
      type: "ClusterIP",
    },
  });

  const prometheusDeployment = new k8s.apps.v1.Deployment(`${appFqn}-prometheus`, {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      labels: {
        component: "server",
        app: "prometheus",
      },
      name: "prometheus",
      namespace: props.namespace.metadata.name,
    },
    spec: {
      selector: {
        matchLabels: {
          app: "prometheus",
        },
      },
      replicas: 1,
      strategy: {
        type: "Recreate",
      },
      template: {
        metadata: {
          labels: {
            app: "prometheus",
          },
        },
        spec: {
          containers: [
            {
              name: "prometheus-server-configmap-reload",
              image: "jimmidyson/configmap-reload:v0.8.0",
              imagePullPolicy: "IfNotPresent",
              args: [
                "--volume-dir=/etc/config",
                "--webhook-url=http://127.0.0.1:9090/-/reload",
              ],
              resources: {},
              volumeMounts: [{
                name: "config-volume",
                mountPath: "/etc/config",
                readOnly: true,
              }],
            },
            {
              name: "prometheus-server",
              image: "prom/prometheus:v2.41.0",
              imagePullPolicy: "IfNotPresent",
              args: [
                "--storage.tsdb.retention.time=15d",
                "--config.file=/etc/config/prometheus.yml",
                "--storage.tsdb.path=/data",
                "--web.console.libraries=/etc/prometheus/console_libraries",
                "--web.console.templates=/etc/prometheus/consoles",
                "--web.enable-lifecycle",
              ],
              ports: [{
                containerPort: 9090,
              }],
              readinessProbe: {
                httpGet: {
                  path: "/-/ready",
                  port: 9090,
                  scheme: "HTTP",
                },
                initialDelaySeconds: 0,
                periodSeconds: 5,
                timeoutSeconds: 4,
                failureThreshold: 3,
                successThreshold: 1,
              },
              livenessProbe: {
                httpGet: {
                  path: "/-/healthy",
                  port: 9090,
                  scheme: "HTTP",
                },
                initialDelaySeconds: 30,
                periodSeconds: 15,
                timeoutSeconds: 10,
                failureThreshold: 3,
                successThreshold: 1,
              },
              resources: {},
              volumeMounts: [
                {
                  name: "config-volume",
                  mountPath: "/etc/config",
                },
                {
                  name: "storage-volume",
                  mountPath: "/data",
                  subPath: "",
                },
              ],
            },
          ],
          dnsPolicy: "ClusterFirst",
          securityContext: {
            fsGroup: 65534,
            runAsGroup: 65534,
            runAsNonRoot: true,
            runAsUser: 65534,
          },
          terminationGracePeriodSeconds: 300,
          volumes: [
            {
              name: "config-volume",
              configMap: {
                name: "prometheus",
              },
            },
            {
              name: "storage-volume",
              emptyDir: {},
            },
          ],
        },
      },
    },
  });
};
