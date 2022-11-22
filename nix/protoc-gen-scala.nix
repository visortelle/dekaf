{ lib, stdenv, fetchzip }:

let
  src_linux_arm64 = {
    url = "https://github.com/tealtools/ScalaPB/releases/download/v0.11.12-arm64/protoc-gen-scala-0.11.12-arm64-linux-arm64.zip";
    sha256 = "";
  };

  src_linux_x86_64 = {
    url = "https://github.com/tealtools/ScalaPB/releases/download/v0.11.12-arm64/protoc-gen-scala-0.11.12-arm64-linux-x86_64.zip";
    sha256 = "sha256-vHdLOiAKSXKDHI937krghuJGsF2UPBPm8ih4eoOUXjo=";
  };

  src_darwin_x86_64 = {
    url = "https://github.com/tealtools/ScalaPB/releases/download/v0.11.12-arm64/protoc-gen-scala-0.11.12-arm64-osx-x86_64.zip";
    sha256 = "sha256-jdqy97LibGUQ5K7Grq4q1rYBhR+/6uUtJhX+llQ4Xq4=";
  };
in

stdenv.mkDerivation rec {
  pname = "protoc-gen-scala";
  version = "v0.11.12";

  sourceRoot = "source";

  strictDeps = true;

  src = fetchzip (if stdenv.hostPlatform.system == "x86_64-linux" then src_linux_x86_64
  else if stdenv.hostPlatform.system == "aarch64-linux" then src_linux_arm64
  else if stdenv.hostPlatform.system == "x86_64-darwin" then src_darwin_x86_64
  else if stdenv.hostPlatform.system == "aarch64-darwin" then src_darwin_x86_64
  else throw "Unsupported system");

  installPhase = ''
    mkdir -p "$out/bin"
    cp $src/* $out/bin/
  '';

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
