import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { LedwallProject } from "../domain/types";

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
  if (isTauriRuntime()) {
    const path =
      existingPath ??
      (await save({
        title: "Salva progetto Ledwall Designer",
        defaultPath: `${sanitizeFilename(project.metadata.projectName)}.lwd`,
        filters: [{ name: "Progetto Ledwall Designer", extensions: ["lwd"] }],
      }));
    if (!path) return null;
    await invoke("write_text_file", { path, contents });
    return { path };
  }

  downloadBlob(
    new Blob([contents], { type: "application/json" }),
    `${sanitizeFilename(project.metadata.projectName)}.lwd`,
  );
  return { path: `${sanitizeFilename(project.metadata.projectName)}.lwd` };
}

export async function openProjectFile(): Promise<{ project: LedwallProject; path?: string } | null> {
  if (isTauriRuntime()) {
    const path = await open({
      title: "Apri progetto Ledwall Designer",
      multiple: false,
      directory: false,
      filters: [{ name: "Progetto Ledwall Designer", extensions: ["lwd", "json"] }],
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
      title,
      defaultPath: suggestedName,
      filters: [{ name: title, extensions }],
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
  return project as LedwallProject;
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

