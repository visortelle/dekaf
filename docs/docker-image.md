---
sidebar_position: 99
---

# Docker Image

Dekaf runs as a single [Docker container](https://docs.docker.com/guides/walkthroughs/what-is-a-container/).

:::info

The upcoming features like monitoring, horizontal scaling, and enterprise-grade authorization require introducing more moving pieces to make them scalable. These features will be opt-in to keep the base deployment as simple as possible.

:::

Run `docker pull visortelle/dekaf:latest` to get the latest Dekaf image.

Visit the [OCI repository](https://hub.docker.com/repository/docker/visortelle/dekaf) to get the available tags.

**Image details:**

- Supported architectures are `linux/amd64` and `linux/arm64`.

- The image exposes `8090` port.

- The container is configured to run as `dekaf` Linux user.

## Running Dekaf

If you have an existing Apache Pulsar instance, you can run Dekaf by using this command:

```bash
docker run \
  -it \
  -e DEKAF_PULSAR_BROKER_URL="pulsar://0.0.0.0:6650" \
  -e DEKAF_PULSAR_WEB_URL="http://0.0.0.0:8085" \
  -p 8090:8090 \
  visortelle/dekaf:latest
```

This command will run Dekaf, connected to your Apache Pulsar instance.

## Configuration

You can configure Dekaf by mounting the YAML configuration file to the `/dekaf/config.yaml` path.

Configuring application using environment variable is also supported.

See the [Configuration Reference](./configuration-reference) page for more details.

## Data Directory

Dekaf allows users to create reusable objects like pre-configured filters and consumer sessions. These objects are stored in the directory specified by the `dataDir` configuration property.

That means that in production setup you should persist this directory data to make it available after the Dekaf container restart.
