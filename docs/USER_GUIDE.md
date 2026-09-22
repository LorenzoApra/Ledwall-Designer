# Ledwall Designer V1.0 — User guide

The documentation is in English. The app interface is currently in Italian;
**bold labels** below match the application. Installation instructions are in the
[README](../README.md#download-and-install) and on the [website](../site/guide.html).

## 1. Create and save a project

Use **Nuovo** to create a project. Under **Progetto**, enter the project/event
name, company, client, location, author, date and revision. Set the master canvas
width and height in pixels. The name and revision are included in exported filenames.

**Salva** saves a `.lwd` project; **Salva con nome** saves to another location.
**Apri** reopens a saved project. Save regularly: there is no project autosave.
Closing the desktop app with unsaved changes prompts you to save, discard or
cancel. Cancelling or failing to save leaves the app open.

The equipment library is local to this installation. A project references library
model IDs; keep the same custom library available when moving projects between
computers. A `.lwd` file does not embed the complete custom equipment library.

## 2. Check the equipment library

**Librerie** has **Cabinet**, **Sending Card** and **Accessori** sections.
Check cabinet pixel dimensions, physical dimensions, pitch, weight and maximum
and average power before designing. Controller entries include capacity data
and operating-mode parameters. Flybars and plates are editable.

The bundled library comes from `src/data/ledwall-library.csv`. It uses `;` as a
separator and can be edited in a spreadsheet application while preserving its
column structure. Import a local CSV to use shared equipment data.

**Aggiorna dalla rete** downloads and validates the official public CSV. A failed
network update leaves the current library in place. New bundled IDs are added
at startup without overwriting existing local IDs. Back up the CSV you use for
custom libraries; resetting or replacing library data can affect existing projects.

Importing NovaStar `.rcfg`, `.rcfgx` or `.rfcg` files reads cabinet resolution,
module pixel dimensions, scan and receiving-card data when available. Verify
physical size, pitch, weight and power separately; these are not reliable inputs
in the imported format.

## 3. Build the layout

Open **Disegno**, select a screen and choose **Crea bulk** to generate a cabinet
grid. Use **+ Schermo** for another screen. Set the screen name and its **Canvas X**
and **Canvas Y** pixel positions within the master canvas.

Select and move cabinets on the canvas. **Snap** enables snapping. Use the mouse
wheel to zoom around the pointer, or use the zoom slider. Select multiple cabinets
with Cmd/Ctrl-click; Shift-click selects a row. Delete removes selected cabinets
and their references from wiring and rigging; undo restores the operation.

Cabinets excluded from the pixel map remain in the project and structural/weight
calculations, but do not render in the PNG or participate in automatic data/power wiring.

## 4. Plan data cabling

In **Dati**, select/configure the controller and review frame rate, bit depth,
HDR, 3D, low latency, redundancy and safety margin as applicable. These settings
can affect available capacity.

Use automatic wiring for an initial plan, then review every port and warning.
For **MCTRL/VX**, port load uses the bounding rectangle of the connected cabinets
in pixel coordinates. Empty areas inside irregular shapes count as virtual pixels.
For **COEX/MX**, port load uses the sum of actual cabinet pixels. The panel separates
real and virtual pixels; automatic wiring splits runs when capacity is exceeded.

For a manual route:

1. Select the first cabinet and choose a starting port, or click **+ Nuova porta** (`N`).
2. Press and drag across cabinets in the physical cable order.
3. Press Enter/Escape, double-click the canvas or click **Termina** to end the route.
4. Use **Annulla ultimo tratto** to undo the last segment or **Rimuovi cabinet dalla porta**
   to disconnect the selected cabinet.

Under **Porte e backup**, assign free backup ports automatically or choose internal
backup and spare-controller references manually. The wiring PDF includes the assignments.

## 5. Plan power

In **Elettrico**, review voltage, breaker rating and utilization percentage before
creating lines. Use automatic assignment or select a cabinet and **+ Nuova linea**
(`N`). Drag across cabinets in cable order and finish with Enter/Escape or **Termina**.
You can also append to an existing line, undo its last segment or remove a cabinet.

Each line reports cabinet count and maximum/average power in W or kW. Review the
load and the equipment values used for the calculation.

## 6. Plan weight and rigging

Under **Peso**, configure cable/accessory weights and suspension points. Apply
flybars to selected columns for hanging or ground support. Each flybar reports
cabinet, cable/accessory and plate weight, supported load, capacity and utilization.

Support plates can be added manually or generated at internal 2×2 joints using
the configured height threshold. Simple plates and plates with truss clamps are
available; position plates and flybars by dragging them on the layout.

The initial MG7S beam capacity is 200 kg and its own weight is zero until a verified
value is entered. Review all initial equipment values for your actual hardware.
These outputs are planning estimates, not structural certification.

## 7. Export deliverables

Use **Pixelmap** to choose grid, coordinate, circle, diagonal, color-bar, grayscale,
name, resolution and logo overlays. Export a screen at native resolution or the
complete master canvas.

Under **Output**:

| Button | Result |
| --- | --- |
| PDF tecnico + distinta | Technical report and bill of materials, with rigging drawings |
| PDF cablaggi A3 | Separate data and power wiring pages, including backup-port details |
| Schermo selezionato | Native-resolution PNG for the selected screen |
| Canvas master | PNG at the project's master canvas dimensions |

Project files, PDFs and PNGs include the project revision in their filenames.

## Keyboard and mouse reference

| Action | Shortcut |
| --- | --- |
| Save | Cmd/Ctrl + S |
| Undo / Redo | Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z |
| Add/remove cabinet from selection | Cmd/Ctrl + click |
| Select row | Shift + click |
| Select all cabinets on canvas | Cmd/Ctrl + A (outside text fields) |
| Delete selected cabinets | Delete / Backspace (outside text fields) |
| New data port / power line | N in Dati / Elettrico, with a cabinet selected |
| Finish route | Enter / Escape / double-click canvas |
| Zoom | Mouse wheel or toolbar slider |

## Troubleshooting

- **macOS blocks launch:** use the installation instructions; builds are not
  Developer ID signed or notarized. Download the correct processor variant.
- **Windows prompts for a publisher:** the installer is unsigned. Verify the official
  source and use the per-app approval if offered. Managed devices may require an administrator.
- **Windows needs Internet during setup:** WebView2 must be installed if missing.
- **Network library update fails:** continue with the local library or import a CSV.
- **Unexpected port overload:** inspect mode settings and, on MCTRL/VX, the bounding
  rectangle's virtual pixels as well as real pixels.
- **Equipment changes between computers:** install the same library CSV on both machines.
- **Missing work after restart:** reopen the last `.lwd`; project saving is manual.

For help, [open an issue](https://github.com/LorenzoApra/Ledwall-Designer/issues) with
version, OS, processor, steps to reproduce and a minimal sample if available.
