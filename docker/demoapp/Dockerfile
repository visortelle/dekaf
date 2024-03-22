FROM nixos/nix:2.11.1 as builder

WORKDIR /workdir

# Configure Nix
COPY ./docker/demoapp/nix.conf /tmp/nix.conf
RUN cat /tmp/nix.conf >> /etc/nix/nix.conf && rm /tmp/nix.conf
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable && nix-channel --update
RUN nix-env -iA nixpkgs.git-lfs

# Cache Nix dependencies
COPY ./*.nix ./
COPY ./nix ./nix
COPY ./flake.lock ./

RUN nix build -L --show-trace
SHELL ["nix-shell", "--run"]

# Cache dependencies
COPY ./demoapp/build.sbt ./demoapp/
COPY ./demoapp/project/* ./demoapp/project/
RUN cd ./demoapp && sbt update

COPY . .

RUN cd ./proto && make build
RUN cd ./demoapp && make build

RUN cd ./demoapp/target/universal && tar xvf ./dekaf-demoapp.tgz && rm ./dekaf-demoapp.tgz && mv ./dekaf-demoapp /demoapp
RUN cp ./demoapp/config.yaml /demoapp/

################################################################

FROM ghcr.io/graalvm/nodejs-community:23.0.2-jvm17-ol9-20231024 as dekaf

RUN microdnf update -y &&\
  microdnf upgrade \
  --refresh \
  --best \
  --nodocs \
  --noplugins \
  --setopt=install_weak_deps=0 && \
  microdnf clean all && true

RUN useradd --user-group --system --create-home --no-log-init dekaf
USER dekaf
WORKDIR /workdir

COPY --from=builder --chown=dekaf:dekaf /demoapp .

ENTRYPOINT [ "/workdir/bin/demoapp" ]
