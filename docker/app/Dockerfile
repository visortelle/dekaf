FROM tealtools/testrepo:buildimage as builder

SHELL ["/bin/bash", "-l", "-c"]

WORKDIR /workdir

COPY . .

# Build protobuf
RUN cd ./proto && make build

# Build UI
RUN cd ./pulsar-ui && make build && rm -rf ./.next/cache

# Build server
RUN source "$HOME/.sdkman/bin/sdkman-init.sh" &&\
  cd ./api-scala && make build

################################################################

FROM ghcr.io/graalvm/jdk:ol8-java17-22.3.0

RUN useradd --user-group --system --create-home --no-log-init teal-user
USER teal-user
WORKDIR /workdir

COPY --from=builder --chown=tealuser:tealuser /workdir/pulsar-ui/package-lock.json .
COPY --from=builder --chown=tealuser:tealuser /workdir/pulsar-ui/.next .
RUN cd ./pulsar-ui && npm ci

COPY --from=builder --chown=tealuser:tealuser /workdir/api-scala/target/universal/* .
RUN ls -laR  /workdir
# RUN mv /app/pulsar-ui-api* /app/pulsar-ui-api
