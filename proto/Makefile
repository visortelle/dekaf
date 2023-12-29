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
	cd ./dekaf && buf mod update && buf lint && buf generate --include-imports --include-wkt
	cd ./demoapp && buf mod update && buf lint && buf generate --include-imports --include-wkt

