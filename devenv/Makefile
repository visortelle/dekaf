.DEFAULT_GOAL := help

.PHONY: dev-compose
dev-compose: ## Start development using docker-compose (deprecated).
	docker ps -a -q | xargs -I {} docker container rm -f {}
	docker volume ls -q | xargs -I {} docker volume rm {}
	docker-compose up -d

.PHONY: dev-compose-pulsar-manager
dev-compose-pulsar-manager: ## Perepare pulsar-manager.
	./pulsar-manager/create-default-user.sh

.PHONY: dev
dev: ## Install using Kubernetes Helm.
	./helm/install.sh

.PHONY: dev-port-forward
dev-port-forward: ## Forward ports to localhost.
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-broker 8080:8080

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
