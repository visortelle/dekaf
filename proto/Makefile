.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./gen
	rm -rf ../ui/grpc-web
	rm -rf ../server/src/main/scala/pb
	rm -rf ../demoapp/src/main/scala/pb

.PHONY: build
build:
	buf mod update
	buf lint
	cd ./proto && buf breaking . --path tools/teal/pulsar/ui/library/v1/managed_items.proto --against "../../.git#branch=main,subdir=proto/proto"
	buf generate --include-imports --include-wkt
