FROM nixos/nix:2.11.1 as builder

WORKDIR /workdir

# Configure Nix
COPY ./docker/pulsocat/nix.conf /tmp/nix.conf
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

RUN cd ./server/target/universal && unzip ./pulsocat-*.zip && rm ./pulsocat-*.zip && mv ./pulsocat-* /pulsocat
RUN cp ./server/config.yaml /pulsocat/

################################################################

FROM adoptopenjdk/openjdk11:jdk-11.0.8_10-ubuntu as pulsocat
# FROM ghcr.io/graalvm/jdk-community:20.0.2 as pulsocat
# RUN gu install js

RUN useradd --user-group --system --create-home --no-log-init pulsocat
USER pulsocat
WORKDIR /pulsocat

COPY --from=builder --chown=pulsocat:pulsocat /pulsocat .

EXPOSE 8090
EXPOSE 9901

ENTRYPOINT [ "/pulsocat/bin/pulsocat" ]
