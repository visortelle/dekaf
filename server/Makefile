.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: clean
clean:
	rm -rf ./target

.PHONY: test
clean:
	sbt test

.PHONY: build-any
build-any:
	cd ./data/js && npm install && npm run build
	cp -r ./data ./src/universal/
	rm -rf ./src/universal/data/js/node_modules

.PHONY: build
build: # Build
	make build-any
	sbt universal:packageZipTarball -DisBinaryBuild=true

.PHONY: build-desktop
build-desktop: # Build desktop app
	make build-any
	sbt universal:packageZipTarball -DisBinaryBuild=true -DisDesktopBuild=true

.PHONY: dev
dev: ## Start development
	sbt ~reStart
