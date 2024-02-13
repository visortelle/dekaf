.DEFAULT_GOAL := clean-and-build

.PHONY: build
build:
	npm ci
	npm run package

.PHONY: clean
clean:
	rm -rf ./node_modules

.PHONY: dev
dev:
	npm start
