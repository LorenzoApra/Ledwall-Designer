import { zipSync } from "fflate";
import type { AppLibraries, LedwallProject } from "../domain/types";
import type { AppLanguage } from "../i18n";
import { canvasToPngBytes, versionedFilename } from "../platform/files";
import { renderMasterPixelmap, renderScreenPixelmap } from "./pixelmap";
import { exportScreenList, selectedCanvasProjects, uniqueExportFilename } from "./selection";

export type BatchExportKind = "screenPng" | "masterPng" | "pixelmapPdf" | "pixelmapBundle" | "technicalPdf" | "wiringPdf";

export async function prepareBatchExport(
  project: LedwallProject, libraries: AppLibraries, screenIds: string[], kind: BatchExportKind,
  language: AppLanguage, onProgress?: (completed: number, total: number) => void,
): Promise<{ bytes: Uint8Array; name: string; mimeType: string; extension: string; screenCount: number; skippedScreens: number }> {
  const available = exportScreenList(project, libraries);
  const requested = new Set(screenIds);
  const selected = available.filter((screen) => requested.has(screen.id) && screen.cabinetCount > 0);
  if (!selected.length) throw new Error("Seleziona almeno uno schermo con cabinet.");
  const pixelmapKind = !["technicalPdf", "wiringPdf"].includes(kind);
  const eligible = pixelmapKind ? selected.filter((screen) => screen.activePixels > 0) : selected;
  if (!eligible.length) throw new Error("Gli schermi selezionati non hanno cabinet attivi nella pixelmap.");
  const scopes = selectedCanvasProjects(project, eligible.map((screen) => screen.id));
  const files: { name: string; bytes: Uint8Array }[] = [];
  const usedNames = new Set<string>();
  const add = (name: string, bytes: Uint8Array) => files.push({ name: uniqueExportFilename(name, usedNames), bytes });
  const pixelmapLabel = language === "en" ? "Pixelmaps" : "Pixelmap";
  if (["technicalPdf", "wiringPdf", "pixelmapPdf", "pixelmapBundle"].includes(kind)) {
    const reports = await import("./reports");
    const label = kind === "technicalPdf" ? (language === "en" ? "Technical report" : "Relazione tecnica")
      : kind === "wiringPdf" ? (language === "en" ? "Wiring" : "Cablaggi") : pixelmapLabel;
    const bytes = kind === "technicalPdf" ? reports.createTechnicalBatchPdf(project, libraries, eligible.map((screen) => screen.id), language)
      : kind === "wiringPdf" ? reports.createWiringBatchPdf(project, libraries, eligible.map((screen) => screen.id), language)
      : await reports.createPixelmapPdf(project, libraries, eligible.map((screen) => screen.id), language, onProgress);
    add(versionedFilename(project, label, "pdf"), bytes);
  }
  if (kind === "screenPng" || kind === "pixelmapBundle") {
    let completed = 0;
    for (const scope of scopes) {
      for (const screen of scope.screens) {
        const rendered = await renderScreenPixelmap(scope, libraries, screen);
        add(versionedFilename(project, rendered.label, "png"), await canvasToPngBytes(rendered.canvas));
        rendered.canvas.width = 1;
        rendered.canvas.height = 1;
        onProgress?.(++completed, eligible.length);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    }
  } else if (kind === "masterPng") {
    for (let index = 0; index < scopes.length; index += 1) {
      const rendered = await renderMasterPixelmap(scopes[index], libraries);
      add(versionedFilename(project, rendered.label, "png"), await canvasToPngBytes(rendered.canvas));
      rendered.canvas.width = 1;
      rendered.canvas.height = 1;
      onProgress?.(index + 1, scopes.length);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
  const skippedScreens = selected.length - eligible.length;
  if (files.length === 1) {
    const file = files[0];
    const extension = file.name.endsWith(".png") ? "png" : "pdf";
    return { ...file, extension, mimeType: extension === "png" ? "image/png" : "application/pdf", screenCount: eligible.length, skippedScreens };
  }
  const archive: Record<string, Uint8Array> = {};
  files.forEach((file) => { archive[file.name] = file.bytes; });
  return { bytes: zipSync(archive, { level: 0 }), name: versionedFilename(project, `${pixelmapLabel} - ${language === "en" ? "screens" : "schermi"}`, "zip"),
    extension: "zip", mimeType: "application/zip", screenCount: eligible.length, skippedScreens };
}
