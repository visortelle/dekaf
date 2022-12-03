FROM nixos/nix:2.11.1

WORKDIR /workdir

# Configure Nix
RUN nix-channel --add https://nixos.org/channels/nixpkgs-unstable && nix-channel --update
COPY ./docker/app/nix.conf /tmp/nix.conf
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

# ################################################################

# FROM ghcr.io/graalvm/jdk:ol8-java17-22.3.0

# RUN useradd --user-group --system --create-home --no-log-init teal-user
# USER teal-user
# WORKDIR /workdir

# COPY --from=builder --chown=tealuser:tealuser /workdir/server/target/universal/* .
