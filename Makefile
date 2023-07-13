.PHONY: build-pulsocat
build-pulsocat:
	cd ./proto && make clean-and-build
	cd ./ui && make clean-and-build && make test
	cd ./server && make clean-and-build && make test
	cd ./docker/pulsocat && make build

.PHONY: build-demoapp
build-demoapp:
	cd ./docker/demoapp && make build

.PHONY: dev
dev:
	nix develop
