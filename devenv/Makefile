.DEFAULT_GOAL := help

.PHONY: dev
dev: ## Start development.
	docker ps -a -q | xargs -I {} docker container rm -f {}
	docker volume ls -q | xargs -I {} docker volume rm {}
	docker-compose up -d

.PHONY: pulsar-manager
pulsar-manager: ## Perepare pulsar-manager.
	./pulsar-manager/create-default-user.sh

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
