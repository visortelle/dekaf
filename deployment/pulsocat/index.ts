import * as pulsocat from "./pulsocat/pulsocat";
import * as grafana from "./grafana/grafana";
import { mkIsPublicDemo } from "./shared/shared";

const isPublicDemo = mkIsPublicDemo();

const pulsocatResources = pulsocat.createResources();

if (isPublicDemo) {
  const grafanaResources = grafana.createResources({
    namespace: pulsocatResources.namespace,
  });
}
