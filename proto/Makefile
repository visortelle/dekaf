.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./gen
	rm -rf ../ui/grpc-web
	rm -rf ../server/src/main/scala/pb

.PHONY: build
build:
	buf mod update
	buf lint
	buf generate --include-imports --include-wkt
