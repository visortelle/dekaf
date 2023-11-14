{ lib, stdenv, fetchurl }:

let
  src_linux_arm64 = {
    url = "https://github.com/grpc/grpc-web/releases/download/1.4.2/protoc-gen-grpc-web-1.4.2-linux-aarch64";
    sha256 = "2zseGChKFXsTYey3lQLl9GI6IS2vcYXxfjW9jiOQVaQ=";
  };

  src_linux_x86_64 = {
    url = "https://github.com/grpc/grpc-web/releases/download/1.4.2/protoc-gen-grpc-web-1.4.2-linux-x86_64";
    sha256 = "sha256-XoLD8fQ14XbJS5TelmmRGrO/uJFgi36Arf81j3d/+Fc=";
  };

  src_darwin_x86_64 = {
    url = "https://github.com/grpc/grpc-web/releases/download/1.4.2/protoc-gen-grpc-web-1.4.2-darwin-x86_64";
    sha256 = "sha256-a3Po6e8t6xFNOcnuoXf/hFDZLnFUteR96maKQ0maI4M=";
  };
in

stdenv.mkDerivation rec {
  pname = "protoc-gen-grpc-web";
  version = "v1.4.2";

  src = fetchurl (if stdenv.hostPlatform.system == "x86_64-linux" then src_linux_x86_64
  else if stdenv.hostPlatform.system == "aarch64-linux" then src_linux_arm64
  else if stdenv.hostPlatform.system == "x86_64-darwin" then src_darwin_x86_64
  else if stdenv.hostPlatform.system == "aarch64-darwin" then src_darwin_x86_64
  else throw "Unsupported system");

  dontUnpack = true;

  installPhase = ''
    mkdir -p "$out/bin"
    cp $src $out/bin/
    mv $out/bin/* $out/bin/protoc-gen-grpc-web
    chmod +x $out/bin/protoc-gen-grpc-web
  '';

  outputs = [ "out" ];

  meta = with lib; {
    homepage = "https://github.com/grpc/grpc-web";
    description = "gRPC for Web Clients";
    license = licenses.asl20;
    platforms = platforms.unix;
  };
}

