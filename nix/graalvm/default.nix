{ lib, stdenv, fetchzip, fetchurl, zlib, file }:

let
  src_linux_arm64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-20.0.1/graalvm-community-jdk-20.0.1_linux-aarch64_bin.tar.gz";
    sha256 = "";
  };

  src_linux_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-20.0.1/graalvm-community-jdk-20.0.1_linux-x64_bin.tar.gz";
    sha256 = "sha256-5TwxugnfXUhv+Po1dYQnK1LW/VQ+CMPWjzQJNchZh+8=";
  };

  src_darwin_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-20.0.1/graalvm-community-jdk-20.0.1_macos-x64_bin.tar.gz";
    sha256 = "sha256-cv62wio8JGwlktsXPxMu6SYUwE/vFsrPY+3cCc2prMI=";
  };

  src_darwin_arm64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/jdk-20.0.1/graalvm-community-jdk-20.0.1_macos-aarch64_bin.tar.gz";
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
  else if system == "aarch64-darwin" then src_darwin_arm64
  else throw "Unsupported system");

  runtimeLibraryPath = lib.makeLibraryPath ([ zlib ]);
  buildInputs = [ file ];

  installPhase = ''
    mkdir -p "$out"

    if [[ -d "$src/Contents" ]]; then
      cp -r $src/Contents/Home/* $out/;
    else
      cp -r $src/* $out/;
    fi

    chmod -R 700 $out;

    export LD_LIBRARY_PATH="${runtimeLibraryPath}"

    if (uname -a | grep -i "linux"); then
      patchelf $out/bin/gu --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)"
      patchelf $out/bin/java --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)"
    fi

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
