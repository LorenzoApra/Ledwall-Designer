# V1.0 preparation validation — 2026-09-22

## Completed locally

- 26 existing domain tests passed.
- TypeScript production build and Vite build passed.
- macOS Apple Silicon and Intel release binaries compiled with Cargo's lockfile.
- Both final DMGs passed `hdiutil verify`.
- Both disk images were mounted read-only and checked: version 1.0.0,
  minimum macOS version 12.0, the expected arm64/x86_64 executable architecture,
  valid ad-hoc code signature (`codesign --verify --deep --strict`), and an exact
  copy of GPL v3 in `Contents/Resources/LICENSE`.
- Packages and per-file SHA-256 checksums are in the ignored `artifacts/v1.0.0/`
  directory. `SHA256SUMS-macos.txt` covers only the two local Mac packages.
- Homepage and guide reviewed in the local browser; navigation and FAQ expansion checked.
- Local website links, anchors and assets resolve.
- Download-link behavior checked with unpublished, fully published, partially
  available and offline release responses; network lookup has an 8-second timeout.
- Workflow YAML parsed, release metadata checked and `git diff --check` passed.

## GitHub builds completed

[Build desktop release #2](https://github.com/LorenzoApra/Ledwall-Designer/actions/runs/35742460856)
completed successfully for macOS arm64, macOS x64 and Windows x64. All three jobs
passed the 26 domain tests and produced their installers and SHA-256 files.

Build commit: `3e60717db77c7cd6ca05124c47035f6788408f8a`. Application source and
dependencies are identical to tag `v1.0.0`; the only subsequent code change
normalizes Windows CRLF line endings in the release metadata checker. The original
tag run passed both Mac builds but failed this check on Windows. A manual run of
the corrected commit succeeded. The draft is assembled from that single run. The three downloaded artifact ZIPs
and all installer checksums were verified before upload; `SHA256SUMS.txt` includes
all three installers.

## Pending before public release
- Smoke-test the final packages on Apple Silicon, an Intel Mac and Windows.
  Architecture/signature validation and cross-compilation do not replace launch,
  save/open and export tests on each target system.
- Review the release draft and publish only after owner approval.
- Enable GitHub Pages and run its manual deployment after owner approval.

Code, documentation and the version tag are on GitHub. The release is being
prepared as a draft and has not been published. GitHub Pages has not been deployed;
the website is available from the local preview server.

## Local build notes

This Mac's selected Xcode requires license setup, while its separately installed
Command Line Tools are usable. Builds selected those tools with a process-local
`DEVELOPER_DIR=/Library/Developer/CommandLineTools`; no global setting was changed.
The Intel Rust standard-library target was installed for cross-compilation.

The Tauri DMG EULA step failed when a license file was supplied from this checkout.
The GPL is therefore included as an app resource on macOS; the Windows installer
also uses it as its license file. This does not change the GPL licensing terms.
