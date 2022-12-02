.DEFAULT_GOAL := clean-and-build

.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./node_modules

.PHONY: build
build:
	npm ci
	npm run build
