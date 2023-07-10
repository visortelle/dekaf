{ lib, stdenv, fetchzip, fetchurl, zlib, file, bash }:

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
    url = "";
    sha256 = "";
  };

  js_linux_arm64 = {
    url = "";
    sha256 = "";
  };

  js_linux_x86_64 = {
    url = "https://github.com/oracle/graaljs/releases/download/graal-23.0.0/js-installable-svm-java20-linux-amd64-23.0.0.jar";
    sha256 = "sha256-tF4dOezfDwslIF0a4OFccKys4DgqopGpv0wcpRDds9I=";
  };

  js_darwin_x86_64 = {
    url = "https://github.com/oracle/graaljs/releases/download/graal-23.0.0/js-installable-svm-java20-darwin-amd64-23.0.0.jar";
    sha256 = "sha256-VdtoplVbi43bvut0zUcqyVyahJKzHUl+TKrbUa9C+ag=";
  };

  js_darwin_arm64 = {
    url = "";
    sha256 = "";
  };

  icu4j_linux_arm64 = {
    url = "";
    sha256 = "";
  };

  icu4j_linux_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/graal-23.0.0/icu4j-installable-ce-java20-linux-amd64-23.0.0.jar";
    sha256 = "sha256-NpqaRb+GsPhVFZLDzpMmUl5FNDRQLHmN4KGDhM2TZBQ=";
  };

  icu4j_darwin_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/graal-23.0.0/icu4j-installable-ce-java20-darwin-amd64-23.0.0.jar";
    sha256 = "sha256-Z/judX9NbxSravWXn3iBAsHqDq8+ofOa6ZRTBKABR2I=";
  };

  icu4j_darwin_arm64 = {
    url = "";
    sha256 = "";
  };

  regex_linux_arm64 = {
    url = "";
    sha256 = "";
  };

  regex_linux_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/graal-23.0.0/regex-installable-ce-java20-linux-amd64-23.0.0.jar";
    sha256 = "sha256-GXiJyCdAIbTwlrcH/cF+ig3dweOy8TruV4J7TTBJUzM=";
  };

  regex_darwin_x86_64 = {
    url = "https://github.com/graalvm/graalvm-ce-builds/releases/download/graal-23.0.0/regex-installable-ce-java20-darwin-amd64-23.0.0.jar";
    sha256 = "sha256-AoII6Laeb3ZVqGi5hNOpIa3qDaU1z8hoxSLkytWkzkk=";
  };

  regex_darwin_arm64 = {
    url = "";
    sha256 = "";
  };

in

stdenv.mkDerivation rec {
  pname = "graalvm";
  version = "23.0.0";

  sourceRoot = "source";

  strictDeps = true;

  system = stdenv.hostPlatform.system;

  src = fetchzip (if system == "x86_64-linux" then src_linux_x86_64
  else if system == "aarch64-linux" then src_linux_arm64
  else if system == "x86_64-darwin" then src_darwin_x86_64
  else if system == "aarch64-darwin" then src_darwin_arm64
  else throw "Unsupported system");

  js_jar = fetchurl (if system == "x86_64-linux" then js_linux_x86_64
  else if system == "aarch64-linux" then js_linux_arm64
  else if system == "x86_64-darwin" then js_darwin_x86_64
  else if system == "aarch64-darwin" then js_darwin_arm64
  else throw "Unsupported system");

  icu4j_jar = fetchurl (if system == "x86_64-linux" then icu4j_linux_x86_64
  else if system == "aarch64-linux" then icu4j_linux_arm64
  else if system == "x86_64-darwin" then icu4j_darwin_x86_64
  else if system == "aarch64-darwin" then icu4j_darwin_arm64
  else throw "Unsupported system");

  regex_jar = fetchurl (if system == "x86_64-linux" then regex_linux_x86_64
  else if system == "aarch64-linux" then regex_linux_arm64
  else if system == "x86_64-darwin" then regex_darwin_x86_64
  else if system == "aarch64-darwin" then regex_darwin_arm64
  else throw "Unsupported system");

  runtimeLibraryPath = lib.makeLibraryPath ([ zlib ]);
  buildInputs = [ file bash ];

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
      patchelf $out/bin/java --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)"
    fi

    patchShebangs $out/lib/installer/bin/gu
    $out/lib/installer/bin/gu install -L ${icu4j_jar}
    $out/lib/installer/bin/gu install -L ${regex_jar}
    $out/lib/installer/bin/gu install -L ${js_jar}
  '';

  outputs = [ "out" ];

  meta = with lib; {
    homepage = "https://github.com/graalvm/graalvm-ce-builds";
    description = "GraalVM CE binaires built by the GraalVM community.";
    maintainers = with maintainers; [ jk ];
    platforms = platforms.unix;
  };
}
