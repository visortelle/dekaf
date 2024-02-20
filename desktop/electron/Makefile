.DEFAULT_GOAL := clean-and-build

.PHONY: build
build:
	cd ../../proto && make build
	cd ../../ui && make build
	cd ../../demoapp && make build
	cd ../../server && make build-desktop

	npm ci
	npm run package

.PHONY: clean
clean:
	rm -rf ./node_modules
	rm -rf ./release/build

.PHONY: clean-and-build
clean-and-build:
	make clean
	make build

.PHONY: dev
dev:
	npm start
