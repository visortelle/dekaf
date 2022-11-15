{
  description = "A library for probabilistic programming in Haskell.";
  inputs = {
    nixpkgs = {
      url = "nixpkgs/nixos-unstable";
    };
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
    flake-utils = {
      url = "github:numtide/flake-utils";
    };
  };
  outputs = {
    self,
    nixpkgs,
    flake-compat,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachSystem
    [
      flake-utils.lib.system.x86_64-linux
      flake-utils.lib.system.x86_64-darwin
      flake-utils.lib.system.aarch64-linux
      flake-utils.lib.system.aarch64-darwin
    ]
    (
      system: let
        inherit (nixpkgs) lib;

        pkgs = import nixpkgs {
          system = system;
          config.allowBroken = true;
        };

        protoc-gen-grpc-web = pkgs.callPackage ./nix/protoc-gen-grpc-web.nix {};
        protoc-gen-scala = pkgs.callPackage ./nix/protoc-gen-scala.nix {};

        # export JAVA_HOME=$(echo "$(which java)" | sed 's/bin\/java//' )

        pulsar-ui-dev = pkgs.mkShell {
          packages = [
            pkgs.nodejs-18_x

            pkgs.graalvm17-ce
            pkgs.dotty
            pkgs.scalafmt
            pkgs.scalafix
            pkgs.sbt
            pkgs.maven

            pkgs.protobuf3_20
            pkgs.buf
            protoc-gen-grpc-web
            protoc-gen-scala

            pkgs.kubectl
            pkgs.awscli2
            pkgs.podman
            pkgs.qemu
          ];
        };
      in rec {
        packages = {};
        packages.default = pulsar-ui-dev;
        devShells.default = pulsar-ui-dev;
        devShell = devShells.default;
      }
    );
}
