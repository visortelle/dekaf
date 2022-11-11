FROM tealtools/testrepo:buildimage as builder

SHELL ["/bin/bash", "-l", "-c"]

WORKDIR /project

COPY . .

# Build protobuf
RUN cd ./proto && make build

# Build UI
RUN cd ./pulsar-ui && make build && rm -rf ./.next/cache

# Build server
RUN <<EOF
source "$HOME/.sdkman/bin/sdkman-init.sh"
cd ./api-scala && make build
EOF

################################################################

FROM ghcr.io/graalvm/jdk:ol8-java17-22.3.0

RUN useradd --user-group --system --create-home --no-log-init tealuser
USER tealuser
WORKDIR /home/tealuser

COPY --from=builder --chown=tealuser:tealuser /project/pulsar-ui/.next .

COPY --from=builder --chown=tealuser:tealuser /project/api-scala/target/universal/* .
RUN mv /app/pulsar-ui-api* /app/pulsar-ui-api
