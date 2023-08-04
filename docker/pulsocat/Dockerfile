FROM nixos/nix:2.11.1 as builder

WORKDIR /workdir

# Configure Nix
COPY ./docker/pulsocat/nix.conf /tmp/nix.conf
RUN cat /tmp/nix.conf >> /etc/nix/nix.conf && rm /tmp/nix.conf
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable && nix-channel --update

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

RUN cd ./server/target/universal && unzip ./pulsocat-*.zip && rm ./pulsocat-*.zip && mv ./pulsocat-* /pulsocat
RUN cp ./server/config.yaml /pulsocat/

################################################################

FROM ghcr.io/graalvm/graalvm-community:20.0.2 as pulsocat
RUN gu install js

RUN useradd --user-group --system --create-home --no-log-init pulsocat
USER pulsocat
WORKDIR /pulsocat

ENV PULSOCAT_PORT=8090
ENV PULSOCAT_PUBLIC_URL=http://localhost:8090
ENV PULSOCAT_LIBRARY_PATH=/pulsocat/lib
ENV PULSOCAT_PULSAR_INSTANCE_NAME=default
ENV PULSOCAT_PULSAR_INSTANCE_BROKER_SERVICE_URL=pulsar://localhost:6650
ENV PULSOCAT_PULSAR_INSTANCE_WEB_SERVICE_URL=http://localhost:8080

COPY --from=builder --chown=pulsocat:pulsocat /pulsocat .

ENTRYPOINT [ "/pulsocat/bin/pulsocat" ]
