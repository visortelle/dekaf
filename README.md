# Teal Tool for Apache Pulsar

**Teal Tool for Apache Pulsar** helps developers and system administrators to manage and debug Apache Pulsar instances.

## License

```text
/* Copyright © Teal Tools, Inc - All Rights Reserved
 * Unauthorized copying of any content of this software product, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Kiryl Valkovich <kiryl_valkovich@teal.tools>, October 2022
 */
```

## Development

### Frontend

- [ ] Install NodeJS v16

### Backend

- [ ] Install GraalVM <https://www.graalvm.org/>

```bash
java --version
openjdk 17.0.4 2022-07-19
OpenJDK Runtime Environment GraalVM CE 22.2.0 (build 17.0.4+8-jvmci-22.2-b06)
OpenJDK 64-Bit Server VM GraalVM CE 22.2.0 (build 17.0.4+8-jvmci-22.2-b06, mixed mode, sharing)
```

- [ ] Install NodeJS runtime for GraalVM: <https://www.graalvm.org/22.2/reference-manual/js/>

- [ ] Install latest Scala 3 using <https://sdkman.io/>

- [ ] Install SBT <https://www.scala-sbt.org/download.html>

- [ ] Install latest Maven using <https://sdkman.io/>

- [ ] Setup your editor. IntelliJ Idea Community Edition + Scala plugin is preferable. VSCode + Scala Metals is also ok if you don't touch Scala code a lot.

### Other

- [ ] Docker

```bash
docker -v
Docker version 20.10.17, build 100c701
```

- [ ] Protobuf compiler <https://grpc.io/docs/protoc-installation/>

```
protoc --version
libprotoc 3.19.4
```

- [ ] grpc-web <https://github.com/grpc/grpc-web/releases>


## Get access to development Kubernetes cluster

- [ ] Make sure that you have AWS CLI installed: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- [ ] Login to AWS using your Microsoft account: https://tealtools.awsapps.com/start
- [ ] Run `aws configure sso --profile pulsar-developer` command
  - [ ] SSO Start URL: https://tealtools.awsapps.com/start
  - [ ] SSO Region: `eu-central-1`
  - [ ] Role: `pulsarDeveloper`. If you don't have such role, ask an administrator.
  - [ ] CLI default client region: `eu-central-1`
- [ ] Add this string to your `~/.zshrc` or `~/.bashrc` file: `export AWS_PROFILE="pulsar-developer"`

- [ ] Make sure that you have kubectl installed: https://kubernetes.io/docs/tasks/tools/
- [ ] Configure kubectl context: `aws eks --region eu-central-1 update-kubeconfig --name pulsar-dev`
- [ ] Ensure that you have access to the Kubernetes cluster by running `kubectl get namespaces`

## Development

- To build proto files, go to `./proto` and run `make build`. VSCode TypeScript server sometimes doesn't see files changes, so press `CMD+Shift+P` and run `Restart TS Server` command.
- `pkill kubectl; make port-forward` in the `./devenv` directory to "make the remote Pulsar available" at the localhost.

## Start

- [ ] At first, you need to Kubernetes cluster. We don't provide instructions for now, just ask an administrator. It's a one-time action.

Everything in different terminals.

### Run Envoy proxy

Currently it's needed for grpc-web.

- `cd ./devenv`
- `make dev`

### Frontend

- `cd ./pulsar-ui`
- `npm i`
- `npm run dev`

### API

- `cd ./api-scala`
- `sbt`, then `~reStart` in the SBT shell
