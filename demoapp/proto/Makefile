.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ../src/main/java/com

.PHONY: build
build:
	buf mod update
	buf lint
	buf generate --include-imports --include-wkt
