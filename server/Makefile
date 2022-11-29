.DEFAULT_GOAL := help

.PHONY: dev
dev: ## Start development
	sbt ~reStart

.PHONY: build
build: # Build
	sbt universal:packageBin

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
