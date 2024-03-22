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

RUN cd ./server/target/universal && tar xvf ./dekaf.tgz && rm ./dekaf.tgz && mv ./dekaf /dekaf
RUN cp -r ./server/data /dekaf/

ARG TARGETPLATFORM
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then ARCHITECTURE=x64; else ARCHITECTURE=arm64; fi && \
  mkdir -p /dekaf/bin && \
  cp -r ./bin/linux/$ARCHITECTURE/* /dekaf/bin/
################################################################

FROM ghcr.io/graalvm/nodejs-community:23.0.1-jvm20-ol9-20230725 as graalvm

RUN microdnf update -y &&\
  microdnf upgrade \
  --refresh \
  --best \
  --nodocs \
  --noplugins \
  --setopt=install_weak_deps=0 && \
  microdnf clean all && \
  rm -rf /usr/lib64/graalvm/graalvm-community-java20/languages/nodejs && \
  rm -rf /usr/lib64/graalvm/graalvm-community-java20/lib/src.zip

FROM scratch as dekaf

RUN useradd --user-group --system --create-home --no-log-init dekaf
USER dekaf

COPY --from=graalvm --chown=dekaf:dekaf / .

WORKDIR /dekaf

COPY --from=builder --chown=dekaf:dekaf /dekaf .

ENV PATH="/dekaf/bin:${PATH}"

EXPOSE 8090

ENTRYPOINT [ "/dekaf/bin/dekaf" ]
