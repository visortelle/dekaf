import * as dekaf from "./dekaf/dekaf";
import * as demoapp from "./demoapp/demoapp";
import { mkIsPublicDemo } from "./shared/shared";

const dekafResources = dekaf.createResources();

const isPublicDemo = mkIsPublicDemo();
if (isPublicDemo) {
  const demoappResources = demoapp.createResources();
}
