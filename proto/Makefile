.DEFAULT_GOAL := help

.PHONY: build
build: ## Build protobuf
	buf lint
	rm -rf ./gen
	buf mod update
	buf generate
	# buf build -o ./gen/protoset

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
