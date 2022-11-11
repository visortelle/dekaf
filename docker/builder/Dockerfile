# Nice article on Docker buildx:
# https://itnext.io/building-multi-cpu-architecture-docker-images-for-arm-and-x86-1-the-basics-2fa97869a99b

FROM ubuntu:22.04

SHELL ["/bin/bash", "-l", "-c"]

ARG TARGETOS
ARG TARGETARCH

RUN echo "TARGETOS=${TARGETOS}" &&\
    echo "TARGETARCH=${TARGETARCH}"

RUN <<EOF
apt-get update && apt-get install -y \
  build-essential \
  zip \
  unzip \
  curl
EOF

# Install NodeJS
RUN <<EOF
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt-get install -y nodejs
EOF

# Install Scala toolset
RUN <<EOF
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 22.3.r19-grl
sdk install maven 3.8.6
sdk install scala 3.2.0
sdk install sbt 1.7.3
sbt --version # warm up
EOF

# Install Protobuf and gRPC toolset
RUN <<EOF
OUT_DIR="${HOME}/protoc" && mkdir $OUT_DIR
PROTOC_VERSION="3.20.1";
if [ $TARGETARCH == "amd64" ]; then PROTOC_URL="https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-linux-x86_64.zip"; fi;
if [ $TARGETARCH == "arm64" ]; then PROTOC_URL="https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-linux-aarch_64.zip"; fi;
curl -LO --fail --output-dir $OUT_DIR "${PROTOC_URL}";
unzip "${OUT_DIR}/*.zip" -d $OUT_DIR;
ln -s "${OUT_DIR}/bin/protoc" /usr/local/bin/;
EOF

## Install buf
RUN <<EOF
BIN="/usr/local/bin"
VERSION="1.9.0"
curl -sSL --fail \
  "https://github.com/bufbuild/buf/releases/download/v${VERSION}/buf-$(uname -s)-$(uname -m)" \
  -o "${BIN}/buf"
chmod +x "${BIN}/buf"
EOF

## Install grpc-web
RUN <<EOF
GRPC_WEB_VERSION="1.4.2";
if [ $TARGETARCH == "amd64" ]; then GRPC_WEB_URL="https://github.com/grpc/grpc-web/releases/download/${GRPC_WEB_VERSION}/protoc-gen-grpc-web-${GRPC_WEB_VERSION}-linux-x86_64"; fi;
if [ $TARGETARCH == "arm64" ]; then GRPC_WEB_URL="https://github.com/grpc/grpc-web/releases/download/${GRPC_WEB_VERSION}/protoc-gen-grpc-web-${GRPC_WEB_VERSION}-linux-aarch64"; fi;
curl -LO --fail --output-dir /usr/local/bin/ "${GRPC_WEB_URL}";
mv /usr/local/bin/protoc-gen-grpc-web* /usr/local/bin/protoc-gen-grpc-web;
chmod +x /usr/local/bin/protoc-gen-grpc-web
EOF

## Install gen-protoc-scala
RUN <<EOF
OUT_DIR=/tmp
PROTOC_GEN_SCALA_VERSION="0.11.12"
if [ $TARGETARCH == "amd64" ]; then PROTOC_GEN_SCALA_URL="https://github.com/scalapb/ScalaPB/releases/download/v${PROTOC_GEN_SCALA_VERSION}/protoc-gen-scala-${PROTOC_GEN_SCALA_VERSION}-linux-x86_64.zip"; fi;
if [ $TARGETARCH == "arm64" ]; then PROTOC_GEN_SCALA_URL="https://github.com/tealtools/ScalaPB/releases/download/v${PROTOC_GEN_SCALA_VERSION}-arm64/protoc-gen-scala-${PROTOC_GEN_SCALA_VERSION}-arm64-linux-arm64.zip"; fi;
curl -LO --fail --output-dir $OUT_DIR "${PROTOC_GEN_SCALA_URL}"
unzip $OUT_DIR/protoc-gen-scala*.zip -d $OUT_DIR
rm $OUT_DIR/protoc-gen-scala*.zip
mv $OUT_DIR/protoc-gen-scala /usr/local/bin/
chmod +x /usr/local/bin/protoc-gen-scala
EOF
