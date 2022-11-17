.PHONY: build
build:
	buf mod update
	buf lint
	rm -rf ./gen
	rm -rf ../ui/grpc-web
	rm -rf ../server/src/main/scala/pb
	buf generate --include-imports --include-wkt
