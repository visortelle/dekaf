.DEFAULT_GOAL := help

.PHONY: build
build: ## Build protobuf
	buf mod update
	buf lint
	rm -rf ./gen
	rm -rf ../pulsar-ui/grpc-web
	rm -rf ../api-scala/src/main/scala/pb
	buf generate --include-imports --include-wkt
	# buf build -o ./gen/protoset

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
