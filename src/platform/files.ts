import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { LedwallProject } from "../domain/types";
import { readLanguage, translateText } from "../i18n";

export interface SavedFile {
  path: string;
}

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function saveProjectFile(
  project: LedwallProject,
  existingPath?: string,
): Promise<SavedFile | null> {
  const contents = JSON.stringify(project, null, 2);
  const defaultName = versionedFilename(project, undefined, "lwd");
  if (isTauriRuntime()) {
    const path =
      (existingPath ? replaceFilename(existingPath, defaultName) : undefined) ??
      (await save({
        title: readLanguage() === "en" ? "Save Ledwall Designer project" : "Salva progetto Ledwall Designer",
        defaultPath: defaultName,
        filters: [{ name: readLanguage() === "en" ? "Ledwall Designer project" : "Progetto Ledwall Designer", extensions: ["lwd"] }],
      }));
    if (!path) return null;
    await invoke("write_text_file", { path, contents });
    return { path };
  }

  downloadBlob(
    new Blob([contents], { type: "application/json" }),
    defaultName,
  );
  return { path: defaultName };
}

export async function openProjectFile(): Promise<{ project: LedwallProject; path?: string } | null> {
  if (isTauriRuntime()) {
    const path = await open({
      title: readLanguage() === "en" ? "Open Ledwall Designer project" : "Apri progetto Ledwall Designer",
      multiple: false,
      directory: false,
      filters: [{ name: readLanguage() === "en" ? "Ledwall Designer project" : "Progetto Ledwall Designer", extensions: ["lwd", "json"] }],
    });
    if (!path || Array.isArray(path)) return null;
    const contents = await invoke<string>("read_text_file", { path });
    return { project: parseProject(contents), path };
  }

  const file = await pickBrowserFile(".lwd,.json");
  if (!file) return null;
  return { project: parseProject(await file.text()) };
}

export async function saveBinary(
  bytes: Uint8Array,
  suggestedName: string,
  title: string,
  extensions: string[],
  mimeType: string,
): Promise<string | null> {
  if (isTauriRuntime()) {
    const path = await save({
      title: translateText(title, readLanguage()),
      defaultPath: suggestedName,
      filters: [{ name: translateText(title, readLanguage()), extensions }],
    });
    if (!path) return null;
    await invoke("write_binary_file", { path, contents: Array.from(bytes) });
    return path;
  }
  const copy = new Uint8Array(bytes);
  downloadBlob(new Blob([copy.buffer], { type: mimeType }), suggestedName);
  return suggestedName;
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG non generato"))), "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export function sanitizeFilename(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ") || "Ledwall"
  );
}

export function versionedFilename(
  project: LedwallProject,
  label: string | undefined,
  extension: string,
): string {
  const revision = sanitizeFilename(project.metadata.revision || "01");
  const parts = [sanitizeFilename(project.metadata.projectName), `Rev ${revision}`];
  if (label) parts.push(sanitizeFilename(label));
  return `${parts.join(" - ")}.${extension.replace(/^\./, "")}`;
}

function replaceFilename(path: string, filename: string): string {
  const separatorIndex = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return separatorIndex >= 0 ? `${path.slice(0, separatorIndex + 1)}${filename}` : filename;
}

function parseProject(contents: string): LedwallProject {
  const project = JSON.parse(contents) as Partial<LedwallProject>;
  if (
    project.schemaVersion !== 1 ||
    !Array.isArray(project.screens) ||
    !Array.isArray(project.cabinets) ||
    !Array.isArray(project.controllers)
  ) {
    throw new Error("Il file non e un progetto Ledwall Designer supportato.");
  }
  const normalized = project as LedwallProject;
  normalized.cabinets = normalized.cabinets.map((cabinet) => ({
    ...cabinet,
    excludeFromPixelmap: cabinet.excludeFromPixelmap ?? false,
  }));
  normalized.screens = normalized.screens.map((screen) => ({
    ...screen,
    suspensionPoints: screen.suspensionPoints ?? [],
    supportPlates: screen.supportPlates ?? [],
    flybars: screen.flybars ?? [],
  }));
  normalized.powerLines = normalized.powerLines ?? [];
  normalized.rigging = {
    cableKgPerCabinet: normalized.rigging?.cableKgPerCabinet ?? 0.35,
    accessoryKgPerCabinet: normalized.rigging?.accessoryKgPerCabinet ?? 0.45,
    hangingBarKgPerPoint: normalized.rigging?.hangingBarKgPerPoint ?? 5,
    simplePlateWeightKg: normalized.rigging?.simplePlateWeightKg ?? 0,
    aliscafPlateWeightKg: normalized.rigging?.aliscafPlateWeightKg ?? 0,
    plateRequirementHeightMm:
      normalized.rigging?.plateRequirementHeightMm ?? 4000,
  };
  return normalized;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pickBrowserFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
