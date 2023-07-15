FROM nixos/nix:2.11.1 as builder

WORKDIR /workdir

# Configure Nix
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable && nix-channel --update
COPY ./docker/pulsocat/nix.conf /tmp/nix.conf
RUN cat /tmp/nix.conf >> /etc/nix/nix.conf && rm /tmp/nix.conf

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

RUN make build-jar
RUN cd ./server/target/universal && unzip ./pulsar-ui-*.zip && rm ./pulsar-ui-*.zip && mv ./pulsar-ui-* /pulsar-ui
RUN cp ./server/config.yaml /pulsar-ui/

################################################################

FROM ghcr.io/graalvm/graalvm-community:20.0.1 as pulsocat
RUN gu install js

RUN useradd --user-group --system --create-home --no-log-init pulsocat
USER pulsocat
WORKDIR /workdir

COPY --from=builder --chown=pulsocat:pulsocat /pulsar-ui .

ENTRYPOINT [ "/workdir/bin/pulsar-ui" ]

# ################################################################

# FROM pulsocat as pulsocat-standalone

