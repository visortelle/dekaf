# Release Process

## Trigger a release or preview

Releases and previews are published by the **Release** GitHub Actions workflow
([`.github/workflows/release.yml`](../.github/workflows/release.yml)), run manually.

- [ ] Open the **Actions** tab → **Release** → **Run workflow**, then choose a
      `branch` (default `main`) and a `bump`:

| `bump` | New version (from latest `vX.Y.Z`) | Published image | Git tag |
| --- | --- | --- | --- |
| `patch` / `minor` / `major` | `X.Y.(Z+1)` / `X.(Y+1).0` / `(X+1).0.0` | public `visortelle/dekaf` (+ `dekaf-demoapp`) | `vX.Y.Z` |
| `preview-patch` / `-minor` / `-major` | as above, plus `-preview.g<sha>` | dev `visortelle/dekaf-dev` (+ `dekaf-demoapp-dev`) | none |

The workflow runs as three jobs: **prepare** (computes the version), **build**
(a matrix that builds each architecture **natively** on its own runner and pushes
by digest only — no tag yet), and **merge** (stitches the per-arch digests into
the final `:X.Y.Z` multi-arch tags). The tag is published only after **both**
architectures build successfully. For a real release the **merge** job also repins
the images in `docker/compose/docker-compose.yaml`, commits that as `Release
vX.Y.Z`, tags it, and pushes the branch and tag. Previews (`preview-*`) publish dev
images only — no commit, no tag.

> The previous `release/release.js` script is superseded by this workflow.

## Build runners

Images are built **natively per architecture** (no QEMU emulation — emulated
`node`/JVM builds deadlock), so two self-hosted runners are required:

| Arch | Runner labels | Host needs |
| --- | --- | --- |
| `linux/amd64` | `self-hosted, x64` | Nix (already required by CI) + Docker/Buildx; LFS via the repo's Nix `git-lfs` |
| `linux/arm64` | `self-hosted, arm64` | A native arm64 host with Docker/Buildx + `git`/`git-lfs` on PATH |

The `prepare` and `merge` jobs run on the `x64` runner. Register a native arm64
runner with the label `arm64`; if it's offline the `build` matrix waits for it.
`docker/dekaf/build.sh` (multi-arch `buildx`) is now only for local builds — the
release workflow builds per-arch inline.

## Make published artifacts publicly accessible

Open the `dekaf-desktop-releases` S3 bucket in browser.

For each distribution file, got to `Permissions` -> `Edit` -> set the both **Read** checkboxes in the `Everyone (public access)`

- [ ] Linux x64 - *.AppImage
- [ ] MacOS x64 - *.dmg
- [ ] MacOS arm64 - *.dmg
- [ ] Windows x64 - *.exe

## Release notes

- [ ] Prepare release notes at the site repo.
- [ ] Prepare < 280 characters message for social media.
- [ ] Prepare YouTube video that covers new features.

## Update links on site

## Update version on site

## Publish release notes
