.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./target

.PHONY: test
clean:
	sbt test

.PHONY: build
build: # Build
	sbt universal:packageZipTarball

.PHONY: dev
dev: ## Start development
	sbt ~reStart
