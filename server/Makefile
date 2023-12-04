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
	cd ./data/js && npm install && npm run build
	cp -r ./data ./src/universal/
	rm -rf ./src/universal/data/js/node_modules
	sbt universal:packageZipTarball -DisBinaryBuild=true

.PHONY: dev
dev: ## Start development
	sbt ~reStart
