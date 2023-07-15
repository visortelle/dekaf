.PHONY: build-app
build-app:
	cd ./proto && make clean-and-build
	cd ./ui && make clean-and-build && make test
	cd ./server && make clean-and-build && make test

.PHONY: build-docker-images
build-docker-images:
	cd ./docker/demoapp && make build
	cd ./docker/demoapp && make push

	cd ./docker/pulsocat && make build
	cd ./docker/demoapp && make push

.PHONY: dev
dev:
	nix develop
