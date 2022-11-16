{ lib, stdenv, fetchzip, fetchurl }:

let
  src_linux_arm64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-22.3.0/graalvm-ce-java19-linux-aarch64-22.3.0.tar.gz";
    sha256 = "";
  };

  src_linux_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-22.3.0/graalvm-ce-java19-linux-amd64-22.3.0.tar.gz";
    sha256 = "";
  };

  src_darwin_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-22.3.0/graalvm-ce-java19-darwin-amd64-22.3.0.tar.gz";
    sha256 = "sha256-cnMEE2CanL0spsnRjZMtomiHVUG/7cZicgZMBem02us=";
  };

  src_darwin_arm64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/vm-22.3.0/graalvm-ce-java19-darwin-aarch64-22.3.0.tar.gz";
    sha256 = "";
  };
in

stdenv.mkDerivation rec {
  pname = "graalvm";
  version = "22.3.0";

  sourceRoot = "source";

  strictDeps = true;

  system = stdenv.hostPlatform.system;

  src = fetchzip (if system == "x86_64-linux" then src_linux_x86_64
  else if system == "aarch64-linux" then src_linux_arm64
  else if system == "x86_64-darwin" then src_darwin_x86_64
  else if system == "aarch64-darwin" then src_darwin_x86_64
  else throw "Unsupported system");

  installPhase = ''
    mkdir -p "$out"

    if [[ -d "$src/Contents" ]]; then
      cp -r $src/Contents/Home/* $out/;
    else
      cp -r $src/* $out/;
    fi

    chmod -R 700 $out

    $out/bin/gu install js
  '';

  outputs = [ "out" ];

  meta = with lib; {
    homepage = "https://github.com/graalvm/graalvm-ce-builds";
    description = "GraalVM CE binaires built by the GraalVM community.";
    maintainers = with maintainers; [ jk ];
    platforms = platforms.unix;
  };
}
