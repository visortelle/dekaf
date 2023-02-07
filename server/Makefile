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
	cd ./library/js && npm install && npm run build
	sbt universal:packageBin

.PHONY: dev
dev: ## Start development
	sbt ~reStart
