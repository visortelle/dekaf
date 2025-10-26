# Dekaf

<p align="center">
  <img src="./dekaf.png" />
</p>

**Dekaf** is a feature-rich open-source UI for [Apache Pulsar](https://pulsar.apache.org/), licensed under [Apache 2.0](./LICENSE.md).

Long story short, initially Dekaf was developed as proprietary software, but after 2+ years of development I didn't found a good way to monetize it.
Some time ago I switched to another project and decided to make Dekaf open source so that it could be useful for others. If ASF would accept this project, I'd donate it.

- ⭐ If you like this work, please push the star button on GitHub
- 🤝 Hire me: [kiryl.valkovich@proton.me](mailto:kiryl.valkovich@proton.me)

- [📚 Quick-start](#Quick-Start)
- [📚 Consumer session tutorial](./docs/consume/consumer-session-tutorial.md)
- [📚 Configuration reference](./docs/configuration-reference.md)

## Features

- Browse Pulsar resources like tenants, namespaces, topics, subscriptions, consumers and producers.
- View stats for each resource.
- Create topics, edit namespace and topic policies, split bundles, etc.
- View messages in a topic or multiple topics at once. Filter messages, colorize them. Save and reuse browse sessions.

## Quick-start

- Please make sure that you have [Docker](https://docs.docker.com/get-docker/) installed
- Open your terminal
- Create a new directory: `mkdir dekaf && cd ./dekaf`
- Download the `docker-compose.yaml` file and start it:

```
wget https://raw.githubusercontent.com/tealtools/dekaf/main/docker-compose.yaml
docker compose pull && docker compose up
```

- Open <http://localhost:8090>
- Wait until Pulsar is ready
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

## Maintenance policy

- Reported critical bugs will be closed in a short time after the open-source release.
- The codebase has some dead code and requires a little cleanup, but it's not in priority at this moment.
- New features will be added if some company decide to sponsor the project.
- PRs are welcome!
- Tell me if you need a desktop version for MacOS and Linux. The Electron app is ready, and if there is any visible demand, I'll release it.
