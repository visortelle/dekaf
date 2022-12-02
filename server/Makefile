.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./target

.PHONY: build
build: # Build
	sbt universal:packageBin

.PHONY: dev
dev: ## Start development
	sbt ~reStart
