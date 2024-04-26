.DEFAULT_GOAL := clean-and-build

.PHONY: clean-and-build
clean-and-build: clean build

.PHONY: build
build:
	npm ci
	npm run build

.PHONY: clean
clean:
	rm -rf ./node_modules

.PHONY: dev
dev:
	npm run dev

.PHONY: dev-prod-build
dev-prod-build:
	npm run dev-prod-build

.PHONY: test
test:
	npm run test

.PHONY: test-all
test-all:
	npm run test-all

