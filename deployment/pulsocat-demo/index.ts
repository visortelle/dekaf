import * as pulumi from "@pulumi/pulumi";
import * as pulsocat from "./pulsocat/pulsocat";
import * as k8s from "@pulumi/kubernetes";

const coreInfra = new pulumi.StackReference(`tealtools/core-infra/prod`);
const kubeconfig = coreInfra.getOutput("kubeconfig");

const k8sProvider = new k8s.Provider("k8s", { kubeconfig });

const pulsocatResources = pulsocat.createResources({ k8sProvider });
