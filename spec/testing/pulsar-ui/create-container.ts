import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";
import { GenericContainer, Wait } from "testcontainers";
import { ContentToCopy, FileToCopy } from "testcontainers/dist/docker/types";
import portfinder from "portfinder";

const dockerTag = execSync(
  path.resolve(__dirname, "../../../docker/app/get-tag.sh")
)
  .toString()
  .trim();

export type PulsarUiContainer = {
  publicBaseUrl: string;
  stop: () => Promise<void>;
};

export type CreateContainerProps = {
  pulsarWebServiceUrl: string;
  pulsarBrokerServiceUrl: string;
};

export async function createContainer(
  props: CreateContainerProps
): Promise<PulsarUiContainer> {
  const hostPort = await portfinder.getPortPromise();

  const contentToCopy: ContentToCopy[] = [];

  const filesToCopy: FileToCopy[] = [];

  const container = await new GenericContainer(dockerTag)
    .withName(`pulsar-ui-test-${new Date().getTime()}`)
    .withExposedPorts({
      container: 8080,
      host: hostPort,
    })
    .withCopyContentToContainer(contentToCopy)
    .withCopyFilesToContainer(filesToCopy)
    // TODO ======================================================================
    .withCommand([`/entrypoint.sh`])
    .withHealthCheck({
      test: [
        "CMD-SHELL",
        "curl http://localhost:8080/admin/v2/brokers/ready | grep ok",
      ],
      interval: 1000,
      retries: 10,
      timeout: 60 * 1000,
      startPeriod: 10 * 1000,
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  const pulsarStandaloneContainer: PulsarUiContainer = {
    brokerServiceUrl: `pulsar://0.0.0.0:${brokerServicePort}`,
    webServiceUrl: `http://0.0.0.0:${webServicePort}`,
    stop: async () => {
      container.stop({ removeVolumes: true, timeout: 30 * 1000 });
    },
  };

  return pulsarStandaloneContainer;
}
