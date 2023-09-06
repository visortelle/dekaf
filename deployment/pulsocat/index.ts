import * as pulsocat from "./pulsocat/pulsocat";
import * as demoapp from "./demoapp/demoapp";
import { mkIsPublicDemo } from "./shared/shared";

const pulsocatResources = pulsocat.createResources();

const isPublicDemo = mkIsPublicDemo();
if (isPublicDemo) {
  const demoappResources = demoapp.createResources();
}
