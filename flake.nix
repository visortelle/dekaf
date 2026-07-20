{
  description = "Tools needed for X-Ray development.";
  inputs = {
    nixpkgs = {
      url = "nixpkgs/nixos-unstable";
    };
    # e2e browsers: playwright-driver.version here MUST equal playwrightVersion in e2e/build.sbt
    # (1.47.0) - bump together. Verify a candidate rev with:
    #   nix eval github:NixOS/nixpkgs/<rev>#legacyPackages.x86_64-linux.playwright-driver.version
    nixpkgs-playwright = {
      url = "github:NixOS/nixpkgs/c792c60b8a97daa7efe41a6e4954497ae410e0c1";
    };
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
    flake-utils = {
      url = "github:numtide/flake-utils";
    };
  };
  outputs =
    { self
    , nixpkgs
    , nixpkgs-playwright
    , flake-compat
    , flake-utils
    ,
    } @ inputs:
    flake-utils.lib.eachSystem
      [
        flake-utils.lib.system.x86_64-linux
        flake-utils.lib.system.x86_64-darwin
        flake-utils.lib.system.aarch64-linux
        flake-utils.lib.system.aarch64-darwin
      ]
      (
        system:
        let
          inherit (nixpkgs) lib;

          pkgs = import nixpkgs {
            system = system;
            config.allowBroken = true;
          };

          protoc-gen-grpc-web = pkgs.callPackage ./nix/protoc-gen-grpc-web.nix { };
          protoc-gen-scala = pkgs.callPackage ./nix/protoc-gen-scala.nix { };

          missingSysPkgs =
            if pkgs.stdenv.isDarwin then
              [
                pkgs.darwin.apple_sdk.frameworks.Foundation
                pkgs.darwin.libiconv
              ]
            else
              [ ];

          # Pre-patched e2e browsers (Linux only - macOS keeps Playwright's own download).
          playwrightBrowsers =
            (import nixpkgs-playwright { inherit system; }).playwright-driver.browsers;

          runtimeLibraryPath = lib.makeLibraryPath ([ pkgs.zlib ]);

          pulsar-ui-dev = pkgs.mkShell {
            shellHook = ''
              export JAVA_HOME=$(echo "$(which java)" | sed 's/\/bin\/java//g' )
              export GRAAL_HOME=$JAVA_HOME
              export NODE_OPTIONS=--max-old-space-size=4096

              export LD_LIBRARY_PATH="${runtimeLibraryPath}"

              source ./dev-env.sh
            '' + lib.optionalString pkgs.stdenv.isLinux ''
              # e2e browsers from the store; the driver must not download into the read-only path.
              export PLAYWRIGHT_BROWSERS_PATH="${playwrightBrowsers}"
              export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            '';

            packages = [
              pkgs.gnumake
              pkgs.coreutils
              pkgs.nodejs-18_x

              pkgs.graalvm-ce
              pkgs.dotty
              pkgs.scalafmt
              pkgs.scalafix
              pkgs.sbt
              pkgs.maven

              pkgs.protobuf3_20
              pkgs.buf
              protoc-gen-grpc-web
              protoc-gen-scala

              pkgs.pulumi-bin
              pkgs.kubectl
              pkgs.kubernetes-helm
              # pkgs.awscli2 # Temporary disable due to failing Nix build
              pkgs.aws-iam-authenticator

              # pkgs.docker-slim

              pkgs.git
              pkgs.git-lfs
              pkgs.unzip
            ] ++ missingSysPkgs;
          };
        in
        rec {
          packages = { };
          packages.default = pulsar-ui-dev;
          devShells.default = pulsar-ui-dev;
          devShell = devShells.default;
        }
      );
}
