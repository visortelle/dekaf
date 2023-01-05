import { GenericContainer, Wait } from "testcontainers";
import portfinder from "portfinder";
import path from "path";
import { ContentToCopy, FileToCopy } from "testcontainers/dist/docker/types";

const pulsarVersion = "2.10.3";

export type PulsarStandaloneContainer = {
  brokerServiceUrl: string;
  webServiceUrl: string;
  stop: () => Promise<void>;
};

export type CreateContainerProps = {
  brokerConf?: string;
};

export async function createContainer(
  props: CreateContainerProps
): Promise<PulsarStandaloneContainer> {
  const brokerServiceHostPort = await portfinder.getPortPromise();
  const webServiceHostPort = await portfinder.getPortPromise();
  const zookeeperServiceHostPort = await portfinder.getPortPromise();

  const contentToCopy: ContentToCopy[] = [
    { target: "/broker.conf.append", content: props.brokerConf || "" },
  ];

  const filesToCopy: FileToCopy[] = [
    {
      target: "/entrypoint.sh",
      source: path.resolve(__dirname, "./entrypoint.sh"),
    },
  ];

  const container = await new GenericContainer(
    `apachepulsar/pulsar-all:${pulsarVersion}`
  )
    .withName(`pulsar-standalone-test-${new Date().getTime()}`)
    .withExposedPorts(
      {
        container: 8080,
        host: webServiceHostPort,
      },
      {
        container: 6650,
        host: brokerServiceHostPort,
      },
      {
        container: 2181,
        host: zookeeperServiceHostPort,
      }
    )
    .withCopyContentToContainer(contentToCopy)
    .withCopyFilesToContainer(filesToCopy)
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

  const pulsarStandaloneContainer: PulsarStandaloneContainer = {
    brokerServiceUrl: `pulsar://0.0.0.0:${brokerServiceHostPort}`,
    webServiceUrl: `http://0.0.0.0:${webServiceHostPort}`,
    stop: async () => {
      container.stop({ removeVolumes: true, timeout: 30 * 1000 });
    },
  };

  return pulsarStandaloneContainer;
}
