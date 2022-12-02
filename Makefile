.DEFAULT_GOAL := build

.PHONY: build-jar
build-jar:
	cd ./proto && make
	cd ./ui && make
	cd ./server && make

.PHONY: build-docker
build-docker:
	cd ./docker && make

.PHONY: dev
dev:
	nix develop
