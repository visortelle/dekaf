.DEFAULT_GOAL := clean-and-build

.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: dev
dev: ## Start development
	sbt ~reStart

.PHONY: clean
clean:
	rm -rf ./target

.PHONY: build
build: # Build
	sbt universal:packageBin

