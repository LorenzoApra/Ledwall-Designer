# Release and website publishing

The display name is **Ledwall Designer V1.0**. Package manifests use **1.0.0** and
the Git tag is **v1.0.0**. Packages are GPL-3.0-only, without commercial publisher
signatures; macOS uses an ad-hoc signature and is not notarized.

## Review locally first

1. Run `pnpm test` and `pnpm release:check`.
2. Run `pnpm site:preview` and open `http://127.0.0.1:4174`.
3. Review the homepage, the English guide, README and `docs/release/v1.0.0.md`.
4. Review all local application changes that will be included in this first release.
5. Approve before pushing, tagging, publishing a release or deploying the website.

The website's download links query the public GitHub API for the exact release
asset names. Until the release is public, they lead to the Releases listing and
show availability information instead of linking to nonexistent installers. If
JavaScript, the API or network is unavailable, the Releases links still work.
No API token, analytics service or external font is embedded in the site.

## Build all installers on GitHub (after approval to upload the changes)

1. Commit the reviewed source, documentation, license, `site/`, `scripts/` and
   `.github/workflows/` to the public repository. Do not commit generated V1.0
   binaries: `artifacts/v*/` is ignored. Historical tracked binaries are unchanged.
2. Push to `main`. This does not publish a website or run a tagged release.
3. Open **Actions → Build desktop release → Run workflow**, select `main`, and run.
4. Download the three workflow artifacts from the completed run. Manual runs on
   `main` only build artifacts; they do not create a release.
5. Install and smoke-test each artifact on its intended platform, ideally including
   an Intel Mac and a Windows PC. A successful cross-compilation is not a runtime test.

The matrix uses macOS runners for Apple Silicon and Intel targets, and a Windows
runner for the x64 NSIS installer. It installs locked frontend dependencies, runs
tests, checks version/license metadata, builds with Cargo's lockfile and collects
packages with stable names. Windows setup downloads WebView2 only if missing.

## Create the release draft

After the exact source and packages are accepted, create and push a tag pointing
to the reviewed commit (these commands are intentionally not part of preparation):

```sh
git tag -a v1.0.0 -m "Ledwall Designer V1.0"
git push origin v1.0.0
```

A tag push builds all three platforms. Only after every build succeeds does the
workflow create a **draft release** and upload:

- `Ledwall-Designer-1.0.0-macos-arm64.dmg`
- `Ledwall-Designer-1.0.0-macos-x64.dmg`
- `Ledwall-Designer-1.0.0-windows-x64-setup.exe`
- `SHA256SUMS.txt`

The notes come from `docs/release/v1.0.0.md`. The workflow refuses to overwrite an
already published release. Rerunning the same tag can replace assets in its draft.
GitHub's source archives and the tagged repository provide the corresponding
source and build instructions. Keep that tag available for users of the binaries.

## Publish the release

1. Review the draft notes and asset names, sizes and checksums.
2. Test the actual draft packages and record the systems tested. See the smoke test below.
3. Remove the preparation-status notice from README when publishing.
4. Open **Releases → Edit draft → Publish release** when approved. Leave pre-release
   unchecked for the stable V1.0 release.

The app does not implement automatic updates. Later versions are downloaded and
installed manually from Releases/the website.

## Publish GitHub Pages

1. In the repository, open **Settings → Pages → Build and deployment → Source**
   and choose **GitHub Actions**.
2. Open **Actions → Publish documentation website → Run workflow** on `main`.
3. Once deployment completes, open:
   `https://lorenzoapra.github.io/Ledwall-Designer/`
4. Confirm the homepage, guide, three download buttons and GitHub issue links work.

The Pages workflow is manual: a normal push does not automatically deploy site
changes. Only `site/` is uploaded. Relative paths support this repository subpath.

## Local package collection

After a platform build succeeds, collect the installer and a SHA-256 file:

```sh
node scripts/collect-release.mjs aarch64-apple-darwin dmg macos-arm64
node scripts/collect-release.mjs x86_64-apple-darwin dmg macos-x64
# On Windows:
node scripts/collect-release.mjs x86_64-pc-windows-msvc exe windows-x64
```

Outputs go into `artifacts/v1.0.0/`. The collector rejects missing, stale or
ambiguous package outputs. The release workflow combines all three checksums and
verifies the files before upload.

If the Mac is configured to use a newly installed Xcode with an unaccepted license,
open Xcode and complete its setup. If separately installed Command Line Tools are
already usable, the build can select those for this process only:

```sh
DEVELOPER_DIR=/Library/Developer/CommandLineTools pnpm tauri build --ci --target aarch64-apple-darwin --bundles dmg -- --locked
```

## Minimum smoke test on each platform

- Install from the downloaded package and launch; check version/architecture.
- Create a cabinet grid, configure data and power routes and add rigging.
- Save a `.lwd`, close the app and reopen the file.
- Confirm the unsaved-changes close prompt and cancel/save behavior.
- Export a screen PNG, master PNG, technical PDF and wiring PDF; open the files.
- Import a local CSV and confirm normal design/export works offline.
- On Windows, verify setup on a machine without WebView2 if available.

## References

- [Tauri distribution](https://v2.tauri.app/distribute/)
- [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Apple app-opening guidance](https://support.apple.com/en-us/102445)
- [GNU GPL version 3](https://www.gnu.org/licenses/gpl-3.0.html)
