{ lib, stdenv, fetchurl }:

let
  src_unix = {
    url = "https://repo1.maven.org/maven2/com/thesamet/scalapb/zio-grpc/protoc-gen-zio/0.6.0-rc6/protoc-gen-zio-0.6.0-rc6-unix.sh";
    sha256 = "sha256-JjpxrkByyw2wIEr++HVk3gAQ5VxI+dIDiQ9AD5/rcGQ=";
    executable = true;
    name = "protoc-gen-zio";
  };
in

stdenv.mkDerivation rec {
  pname = "protoc-gen-zio";
  version = "v0.6.0-rc6";

  strictDeps = true;

  src = fetchurl (if stdenv.hostPlatform.system == "x86_64-linux" then src_unix
  else if stdenv.hostPlatform.system == "aarch64-linux" then src_unix
  else if stdenv.hostPlatform.system == "x86_64-darwin" then src_unix
  else if stdenv.hostPlatform.system == "aarch64-darwin" then src_unix
  else throw "Unsupported system");

  installPhase = ''
    install -D $src $out/bin/protoc-gen-zio
    chmod +x $out/bin/protoc-gen-zio
  '';

  phases = [ "installPhase" ];

  outputs = [ "out" ];

  meta = with lib; {
    homepage = "https://github.com/scalapb/ScalaPB";
    changelog = "https://github.com/scalapb/ScalaPB/blob/${version}/CHANGELOG.md";
    description = "Protocol buffer compiler for Scala.";
    license = licenses.asl20;
    maintainers = with maintainers; [ jk ];
    platforms = platforms.unix;
  };
}
