.DEFAULT_GOAL := help

.PHONY: builder-build-and-push
builder-build-and-push: ## Build and builder image
	./builder/build-and-push.sh

.PHONY: app-build
app-build: ## Build app image
	./app/build.sh

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
