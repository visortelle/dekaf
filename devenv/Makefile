.PHONY: dev-local
dev-local: ## Start development using docker-compose with Pulsar running locally
	docker ps -a -q | xargs -I {} docker container rm -f {}
	docker volume ls -q | xargs -I {} docker volume rm {}
	docker-compose -f ./docker-compose-local.yaml up -d

.PHONY: clean
clean: ## Install using Kubernetes Helm.
	./helm/clean.sh

.PHONY: install
install: ## Install Pulsar using Kubernetes Helm.
	./helm/install.sh

.PHONY: port-forward
port-forward: ## Forward ports to localhost.
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-proxy 8080:8080&
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-proxy 6650:6650&
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-grafana 8300:3000&
