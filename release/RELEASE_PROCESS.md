# Release Process

## Trigger the new version release

**Run it only on the `main` branch**

- [ ] `./release <next_version>`

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
