FROM nixos/nix:2.11.1 as builder

WORKDIR /workdir

# Configure Nix
COPY ./docker/dekaf/nix.conf /tmp/nix.conf
RUN cat /tmp/nix.conf >> /etc/nix/nix.conf && rm /tmp/nix.conf
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable && nix-channel --update
RUN nix-env -iA nixpkgs.git-lfs

# Cache Nix dependencies
COPY ./*.nix ./
COPY ./nix ./nix
COPY ./flake.lock ./

RUN nix build -L --show-trace
SHELL ["nix-shell", "--run"]

# Cache server dependencies
COPY ./server/build.sbt ./server/
COPY ./server/project/* ./server/project/
RUN cd ./server && sbt update

# Cache ui dependencies
COPY ui/package.json ./ui/
COPY ui/package-lock.json ./ui/
RUN cd ./ui && npm ci

COPY . .

RUN cd ./proto && make build
RUN cd ./ui && make build
RUN cd ./server && make build

RUN cd ./server/target/universal && unzip ./dekaf-*.zip && rm ./dekaf-*.zip && mv ./dekaf-* /dekaf
RUN cp ./server/config.yaml /dekaf/
RUN cp -r ./server/library /dekaf/

################################################################

FROM ghcr.io/graalvm/graalvm-community:20.0.2 as dekaf
RUN gu install js

RUN useradd --user-group --system --create-home --no-log-init dekaf
USER dekaf
WORKDIR /dekaf

COPY --from=builder --chown=dekaf:dekaf /dekaf .

EXPOSE 8090

ENTRYPOINT [ "/dekaf/bin/dekaf" ]
