.PHONY: build
build: build-jar build-docker

.PHONY: build-jar
build-jar:
	cd ./proto && make clean-and-build
	cd ./ui && make clean-and-build
	cd ./server && make clean-and-build

.PHONY: build-docker
build-docker:
	cd ./docker && make build

.PHONY: dev
dev:
	nix develop
