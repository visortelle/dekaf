# Quick Start

- Please make sure that you have [Docker](https://docs.docker.com/get-docker/)
- Open your terminal
- Create a new directory: `mkdir dekaf && cd ./dekaf`
- Download the `docker-compose.yaml` file and start it:

```
wget https://raw.githubusercontent.com/visortelle/dekaf/main/docker/compose/docker-compose.yaml
docker compose pull && docker compose up
```

- Open [http://localhost:8090](http://localhost:8090)
- Wait until Pulsar is ready
- Enjoy ☕️

### Demo Application

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
