# Dekaf

<p align="center">
  <img src="./dekaf.png" />
</p>

![Docker Pulls](https://img.shields.io/docker/pulls/visortelle/dekaf)

**Dekaf** is a feature-rich open-source UI for [Apache Pulsar](https://pulsar.apache.org/), licensed under [Apache 2.0](./LICENSE.md).

- ⭐ If you like this work, please push the star button on GitHub
- 📚 Checkout useful Pulsar resources at the [awesome Apache Pulsar](https://github.com/visortelle/awesome-apache-pulsar) list.
- 🤝 Hire me: [kiryl.valkovich@proton.me](mailto:kiryl.valkovich@proton.me)

## Documentation

- [📚 Quick-start](#Quick-start)
- [📚 Helm chart](#Helm-chart)
- [📚 Consumer session tutorial](./docs/consume/consumer-session-tutorial.md)
- [📚 Configuration reference](./docs/configuration-reference.md)

## Features

- Browse Pulsar resources like tenants, namespaces, topics, subscriptions, consumers and producers.
- View stats for each resource.
- Create topics, edit namespace and topic policies, split bundles, etc.
- View messages in a topic or multiple topics at once. Filter messages, colorize them. Save and reuse browse sessions.

There are missing features like multi-user support or message replay. See the [Maintenance policy](#Maintenance-policy) section for details.

## Quick-start

- Please make sure that you have [Docker](https://docs.docker.com/get-docker/) installed
- Open your terminal
- Create a new directory: `mkdir dekaf && cd ./dekaf`
- Download the `docker-compose.yaml` file and start it:

```
wget https://raw.githubusercontent.com/visortelle/dekaf/refs/heads/main/docker/compose/docker-compose.yaml
```

- Run `docker compose up`
- Wait a few seconds until Pulsar and Dekaf are ready
- Open <http://localhost:8090>
- Enjoy ☕️

### Demo application

 We also run a demo application that produces data for two new tenants in this quick start.

If you don't see the `demo-schema-types` and `demo-shop` tenants in the tenant list, try to wait for a few seconds and reload the page.

If you want to disable the demo application, remove it from the `docker-compose.yaml` file.

### Troubleshooting

- If the `pulsar` container cannot start, we recommend ensuring that you have **6GB** or more Docker memory limit. We'll adjust the `docker-compose` memory for a lower limit later.
- In case, you observe bookie-related errors from the `pulsar` container, the simplest way to fix it is to remove the corresponding Docker volume. In case you need the volume data, make a backup first. Otherwise follow these steps:
   - Stop containers by running `docker compose down`
   - Run `docker volume ls | grep pulsar-data` to find the proper `<volume_name>`
   - Run `docker volume rm <volume_name>` to delete the volume
   - Restart containers by running `docker-compose up`

## Helm chart

Dekaf is a part of the official [apache/pulsar-helm-chart](https://github.com/apache/pulsar-helm-chart?tab=readme-ov-file#dekaf-ui).

## Maintenance policy

- Reported critical bugs are planned to be fixed in a short time after the open-source release.
- The codebase has some dead code and requires a little cleanup, but it's not in priority at this moment.
- Small features may be added in my spare time. If some company decide to sponsor complex features, it would be an ideal scenario.
- PRs are welcome! See the [contributing guide](./CONTRIBUTING.md).
- Tell me if you need a desktop version for MacOS and Linux. The Electron app is ready, and if there is any visible demand, I'll release it.

Thank you.
