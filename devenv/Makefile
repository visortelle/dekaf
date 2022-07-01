.DEFAULT_GOAL := help

.PHONY: dev-compose
dev-compose: ## Start development using docker-compose (deprecated).
	docker ps -a -q | xargs -I {} docker container rm -f {}
	docker volume ls -q | xargs -I {} docker volume rm {}
	docker-compose up -d

.PHONY: dev-compose-pulsar-manager
dev-compose-pulsar-manager: ## Perepare pulsar-manager.
	./pulsar-manager/create-default-user.sh

.PHONY: clean
clean: ## Install using Kubernetes Helm.
	./helm/clean.sh

.PHONY: dev
dev: ## Install using Kubernetes Helm.
	./helm/install.sh

.PHONY: port-forward
port-forward: ## Forward ports to localhost.
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-proxy 8080:80&
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-proxy 6650:6650&
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-grafana 8300:3000&

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
