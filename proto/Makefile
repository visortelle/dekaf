.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./gen
	rm -rf ../ui/grpc-web
	rm -rf ../server/src/main/scala/pb
	rm -rf ../demoapp/src/main/scala/pb

.PHONY: build
build: build-ui build-demoapp

define buf_build
	cd ./proto && \
	buf mod update && \
	buf lint --path ./tools/teal/pulsar/$(1) && \
	buf generate --output ../../ --template ./tools/teal/pulsar/$(1)/buf.gen.yaml --path tools/teal/pulsar/$(1) --include-imports --include-wkt
endef

build-ui:
	$(call buf_build,ui)

build-demoapp:
	$(call buf_build,demoapp)

