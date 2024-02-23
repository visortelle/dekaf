.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./gen
	rm -rf ../ui/grpc-web
	rm -rf ../server/src/main/scala/pb
	rm -rf ../demoapp/src/main/scala/pb

.PHONY: build
build: check-breaking-changes build-ui build-demoapp

define buf_build
	cd ./proto && \
	buf mod update && \
	buf lint --path ./tools/teal/pulsar/$(1) && \
	buf generate --output ../../ --template ./tools/teal/pulsar/$(1)/buf.gen.yaml --path tools/teal/pulsar/$(1) --include-imports --include-wkt
endef

check-breaking-changes:
	@echo "Checking for breaking changes..."
	@$(eval BREAKING_CHANGES := $(shell cd ./proto && buf breaking tools/teal/pulsar/ui/library/v1/managed_items.proto --against "../../.git#branch=main,subdir=proto/proto" --limit-to-input-files --exclude-imports))
	@if [ -n "$(BREAKING_CHANGES)" ]; then \
		echo "Breaking changes detected:"; \
		echo "$(BREAKING_CHANGES)"; \
		exit 1; \
	fi

build-ui:
	$(call buf_build,ui)

build-demoapp:
	$(call buf_build,demoapp)

