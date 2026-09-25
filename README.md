# Ledwall Designer

**Offline LED wall design, cabling plans, pixel maps and technical reports.**

Ledwall Designer is a desktop application for planning LED walls with NovaStar
controllers. Build multi-screen layouts, check data-port capacity, arrange power
lines and rigging accessories, and export documentation for your crew.

**V1.0 series** · macOS Apple Silicon & Intel · Windows x64 · GPL-3.0-only

[Website & user guide](https://lorenzoapra.github.io/Ledwall-Designer/) ·
[Releases & downloads](https://github.com/LorenzoApra/Ledwall-Designer/releases) ·
[Report an issue](https://github.com/LorenzoApra/Ledwall-Designer/issues)

> Release preparation: V1.0 packages and the website are being prepared. Until
> publication, use the local preview and the documentation below. The interface
> can be switched between Italian and English from the language menu in the top bar.

## Download and install

Get installers from **GitHub Releases**, not from the repository's historical
`artifacts/` folder. Choose the package matching your computer:

| Platform | Package | Requirements |
| --- | --- | --- |
| Mac Apple Silicon | `Ledwall-Designer-1.0.0-macos-arm64.dmg` | macOS 12 or later, Apple M-series chip |
| Mac Intel | `Ledwall-Designer-1.0.0-macos-x64.dmg` | macOS 12 or later, Intel processor |
| Windows | `Ledwall-Designer-1.0.0-windows-x64-setup.exe` | Windows 10/11 x64, Intel/AMD processor, WebView2 |

These are the configured platform targets; see the release notes for validation
status. Windows ARM and Linux packages are not part of V1.0.

### macOS

1. Check **Apple menu → About This Mac**: “Chip” identifies Apple Silicon;
   “Processor: Intel” identifies an Intel Mac.
2. Download and open the matching `.dmg`; drag **Ledwall Designer** to **Applications**.
3. Eject the disk image and open the app from Applications.
4. The app has an ad-hoc signature, but is **not Developer ID signed or notarized**.
   If macOS blocks it, attempt to open it once, then go to **System Settings →
   Privacy & Security → Open Anyway** and confirm. On macOS 12, use **System
   Preferences → Security & Privacy → General**. Only approve the copy downloaded
   from this repository. See [Apple's instructions](https://support.apple.com/en-us/102445).

### Windows

1. Download and run the x64 `-setup.exe` installer. Installation is per user.
2. The installer is not signed with a commercial code-signing certificate.
   Windows may show an unknown-publisher/SmartScreen prompt; when available,
   choose **More info → Run anyway** after checking the download source.
3. WebView2 is required. The installer downloads it if it is missing, so the first
   installation may need Internet access. The installed app works offline.

If your organization's policy blocks unsigned apps, ask your administrator.
Do not disable system-wide protection to install the app.

## Quick start

Use the **Language** menu in the top bar to switch between **Italiano** and
**English**. The choice is saved locally and also applies to exported PDFs.

1. **Progetto** (Project): enter the project/event name, revision and master canvas size.
2. **Librerie** (Libraries): check your cabinet dimensions, pixel resolution,
   weight and maximum/average power; select the appropriate controller model.
3. **Disegno → Crea bulk** (Design → Create grid): choose a cabinet model and
   grid dimensions. Use **+ Schermo** to add screens; position them on the master canvas.
4. **Dati** (Data): configure the controller mode, assign ports automatically or
   trace cables manually, and review capacity and backup-port assignments.
5. **Elettrico** (Power) and **Peso** (Weight): plan power lines and add flybars,
   support plates and accessory weights.
6. **Salva** (Save): save a local `.lwd` project. In **Output**, export PNG pixel
   maps, the technical PDF/bill of materials and A3 wiring PDFs.

[Read the full user guide](docs/USER_GUIDE.md), including shortcuts, library imports,
capacity calculations and troubleshooting.

## Features

- Multiple screens on one master canvas; cabinet grids and individual placement.
- Multiple selection, undo/redo and cabinets excluded from the pixel map while
  remaining in structural and weight calculations.
- Automatic and manual data wiring, internal backup ports and spare-controller references.
- MCTRL/VX port load calculated from the bounding pixel rectangle, including empty
  areas; COEX/MX uses active pixel totals. Configurable controller operating modes.
- Automatic and manual power lines with maximum and average loads.
- Flybars, support plates, suspension points and estimated rigging loads.
- Native-screen/master PNG pixel maps; technical and wiring PDF exports.
- Cabinet, sending-card and accessory libraries; semicolon-separated CSV and
  NovaStar `.rcfg`, `.rcfgx`, `.rfcg` configuration import.
- Manual `.lwd` project saving and a save/discard/cancel prompt on desktop app close.

Projects and calculations stay local. Library data is stored on the current
computer; **Aggiorna dalla rete** explicitly fetches the public library from GitHub.
The app includes an initial library so routine work does not require a connection.

## Development

Requires Node.js 24, pnpm 11.19.0, Rust stable and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.
On macOS install Xcode Command Line Tools. On Windows install Microsoft C++ Build
Tools (Desktop development with C++) and WebView2.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm tauri dev
```

Build locally on macOS:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target aarch64-apple-darwin --bundles dmg -- --locked
pnpm tauri build --target x86_64-apple-darwin --bundles dmg -- --locked
```

Build on Windows:

```sh
pnpm tauri build --target x86_64-pc-windows-msvc --bundles nsis -- --locked
```

[Release and website publishing instructions](docs/RELEASING.md).
The GitHub workflow builds all three packages; tag builds create a **draft** release.
Publishing the release and deploying the website remain explicit steps.

Preview the website:

```sh
pnpm site:preview
```

Open `http://127.0.0.1:4174`. The website is plain HTML/CSS/JavaScript in `site/`.

## Support and license

[Open a GitHub issue](https://github.com/LorenzoApra/Ledwall-Designer/issues) with
app version, operating system, processor type, reproduction steps and, if possible,
a small sample project without private event/client information.

Copyright (C) 2026 Lorenzo Apra. Licensed under the **GNU General Public License,
version 3 only**. See [LICENSE](LICENSE). Distributed without warranty.
Third-party dependencies retain their respective licenses.

NovaStar is a trademark of its owner; this project is not affiliated with or
endorsed by NovaStar. Equipment-library entries include source references where
available and remain editable.
