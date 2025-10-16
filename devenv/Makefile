.PHONY: dev-local
dev-local: ## Start development using docker-compose with Pulsar running locally
	docker ps -a -q | xargs -I {} docker container rm -f {}
	docker volume ls -q | xargs -I {} docker volume rm {}
	docker compose -f ./docker-compose-local.yaml up -d

.PHONY: clean
clean: ## Uninstall Helm release and delete namesapace.
	./helm/clean.sh

.PHONY: install
install: ## Install Pulsar using Kubernetes Helm.
	./helm/install.sh

.PHONY: dev
dev: ## Start development against remote cluster
	pkill kubectl
	kubectl get secret -n pulsar-devenv -o json pulsar-devenv-tls-proxy | jq -r '.data."ca.crt"' | base64 -d > ./helm/tmp/pulsar-proxy-ca.crt

	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-proxy 8080:443&
	kubectl port-forward -n pulsar-devenv service/pulsar-devenv-proxy 6650:6651&
