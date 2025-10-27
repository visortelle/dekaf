# Contributing

The project backend is written in very straightforward Scala without tricky FP and types acrobatics.
If you are an experienced Java developer but don't know Scala, I believe Scala should not become a big barrier.

Frontend is written in TypeScript and React.

For describing backend <----> frontend communication contract (API), we use [Protobuf](https://protobuf.dev/programming-guides/proto3/).

## Development environment

We use Nix to install all tools and other dependencies required for development. You don't need to install JVM, Node, Protobuf compiler separately.

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

If you're using VSCode, use this snippet to create a new component from a template: <https://gist.github.com/visortelle/271627130d7dfcfa44e1f71fc5b6dfaf>

# CI

Run `act` to run GitHub Actions job locally.

## Resources

- [LEARNING.md](./LEARNING.md)
