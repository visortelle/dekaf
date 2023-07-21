# Contributing

## Development environment

- [Install Nix](https://nixos.org/download.html)
- Install [git-lfs](https://git-lfs.github.com/)
- Add the following content to your `~/.gitconfig`:

```
[filter "lfs"]
        required = true
        clean = git-lfs clean -- %f
        smudge = git-lfs smudge -- %f
        process = git-lfs filter-process
```

- Use `make dev` command at the repository root to enter the development environment shell.
- Go to `./devenv` directory and run `make dev-local` to start local Pulsar-standalone instance in Docker.
- Go to the Protobuf definitions directory `cd ./proto` and run `make build` here.
- Go to the server directory `cd ./server` and run `sbt`, then `run` here.
- Open a second terminal, go to the UI directory `cd ./ui` and run `make dev` here.

## Frontend

If you're using VSCode, use a snippet to create a new component from a template.

https://gist.github.com/visortelle/271627130d7dfcfa44e1f71fc5b6dfaf

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

# CI

Run `act` to run GitHub Actions job locally.

## Resources

- [LEARNING.md](./LEARNING.md)
