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
- Go to the server directory `cd ./server` and run `make dev` here.
- Open a second terminal, go to the UI directory `cd ./ui` and run `make dev` here.

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

### Frontend

- `cd ./ui`
- `npm i`
- `npm run dev`

### API

- `cd ./server`
- `sbt`, then `~reStart` in the SBT shell

## Resources

- [LEARNING.md](./LEARNING.md)
