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

For a real release (`patch`/`minor`/`major`) the workflow also repins the images
in `docker/compose/docker-compose.yaml` to the new version, commits that as
`Release vX.Y.Z`, tags it, and pushes the branch and tag, then builds and pushes
the multi-arch images. Previews (`preview-*`) publish a dev image only — no
commit, no tag — for trying out an upcoming version.

> The previous `release/release.js` script is superseded by this workflow.

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
