import * as pulsocat from "./pulsocat/pulsocat";

import { kubeLogin } from './kube-auth/get-kube-server-uri';

kubeLogin();
process.exit(1);

const pulsocatResources = pulsocat.createResources();
