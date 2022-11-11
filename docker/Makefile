.DEFAULT_GOAL := help

.PHONY: build-builder-image
build-builder-image: ## Build builder docker image
	./scripts/build-builder-image.sh

.PHONY: run-builder-image
run-builder-image: ## Run builder docker image
	./scripts/run-builder-image.sh

.PHONY: build-app-image
build-app-image: ## Build app docker image
	./scripts/build-app-image.sh

.PHONY: run-app-image
run-app-image: ## Run app docker image
	./scripts/run-builder-image.sh

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
