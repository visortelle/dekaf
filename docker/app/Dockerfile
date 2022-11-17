FROM nixos/nix:2.11.1 as builder

WORKDIR /src
COPY . .

SHELL ["nix-shell", "--run"]

# Build protobuf
RUN ls -la /
RUN cd ./proto && make build

# Build UI
RUN cd ./ui && make build && rm -rf ./.next/cache

# Build server
RUN cd ./server && make build

################################################################

FROM ghcr.io/graalvm/jdk:ol8-java17-22.3.0

RUN useradd --user-group --system --create-home --no-log-init teal-user
USER teal-user
WORKDIR /workdir

COPY --from=builder --chown=tealuser:tealuser /workdir/ui/package-lock.json .
COPY --from=builder --chown=tealuser:tealuser /workdir/ui/.next .
RUN cd ./ui && npm ci

COPY --from=builder --chown=tealuser:tealuser /workdir/server/target/universal/* .
RUN ls -laR  /workdir
# RUN mv /app/ui-api* /app/ui-api
