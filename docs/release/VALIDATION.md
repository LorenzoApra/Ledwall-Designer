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

## Pending before public release

- Execute the GitHub workflow and compile the Windows x64 NSIS package.
- Smoke-test the final packages on Apple Silicon, an Intel Mac and Windows.
  Architecture/signature validation and cross-compilation do not replace launch,
  save/open and export tests on each target system.
- Review the public release draft, complete all three checksums and publish only
  after owner approval.
- Enable GitHub Pages and run its manual deployment after owner approval.

No GitHub push, tag, release creation or Pages deployment was performed as part of
this preparation. The website is available only from the local preview server.

## Local build notes

This Mac's selected Xcode requires license setup, while its separately installed
Command Line Tools are usable. Builds selected those tools with a process-local
`DEVELOPER_DIR=/Library/Developer/CommandLineTools`; no global setting was changed.
The Intel Rust standard-library target was installed for cross-compilation.

The Tauri DMG EULA step failed when a license file was supplied from this checkout.
The GPL is therefore included as an app resource on macOS; the Windows installer
also uses it as its license file. This does not change the GPL licensing terms.
