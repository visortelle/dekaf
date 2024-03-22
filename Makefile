.PHONY: build-desktop-app
build-desktop-app:
	cd ./desktop/electron && make build

	cd ./ui && make test
	cd ./server && make test

.PHONY: build-docker-images
build-docker-images:
	cd ./docker/dekaf && make build
	# cd ./docker/demoapp && make build

.PHONY: create-multiarch-docker-manifest
create-multiarch-docker-manifest:
	cd ./docker/dekaf && make create-multiarch-docker-manifest
	# cd ./docker/demoapp && make create-multiarch-docker-manifest

.PHONY: publish-helm-chart
publish-helm-chart:
	cd ./helm && make publish

.PHONY: dev
dev:
	nix develop
