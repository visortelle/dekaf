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

.PHONY: test
test:
	npm run test
