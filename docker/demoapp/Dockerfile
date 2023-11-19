FROM nixos/nix:2.16.1 as builder

WORKDIR /workdir

# Configure Nix
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable && nix-channel --update
COPY ./docker/demoapp/nix.conf /tmp/nix.conf
RUN cat /tmp/nix.conf >> /etc/nix/nix.conf && rm /tmp/nix.conf

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

RUN cd ./demoapp && make build
RUN cd ./demoapp/target/universal && unzip ./demoapp-*.zip && rm ./demoapp-*.zip && mv ./demoapp-* /demoapp
RUN cp ./demoapp/config.yaml /demoapp/

################################################################

FROM ghcr.io/graalvm/graalvm-community:20.0.2

RUN useradd --user-group --system --create-home --no-log-init dekaf
USER dekaf
WORKDIR /workdir

COPY --from=builder --chown=dekaf:dekaf /demoapp .

ENTRYPOINT [ "/workdir/bin/demoapp" ]
