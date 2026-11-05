import { jsPDF } from "jspdf";
import { calculatePortMetrics } from "../domain/capacity";
import { calculatePowerLineMetrics } from "../domain/electrical";
import { calculateScreenPixelBounds } from "../domain/geometry";
import { calculateProjectTotals } from "../domain/projectMetrics";
import { calculateFlybarMetrics } from "../domain/flybars";
import type { AppLibraries, LedwallProject } from "../domain/types";
import { renderWiringCanvas } from "./wiringCanvas";
import { renderRiggingCanvas } from "./riggingCanvas";
import { numberLocale, translateText, type AppLanguage } from "../i18n";
import { canvasProject, projectCanvases } from "../domain/canvases";
import { selectedCanvasProjects } from "./selection";
import { renderScreenPixelmap } from "./pixelmap";

export function createTechnicalPdf(
  project: LedwallProject,
  libraries: AppLibraries,
  language: AppLanguage = "it",
  canvasId?: string,
): Uint8Array {
  project = canvasProject(project, canvasId);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  localizePdf(pdf, language);
  appendTechnicalReport(pdf, project, libraries, language);
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

function appendTechnicalReport(pdf: jsPDF, project: LedwallProject, libraries: AppLibraries, language: AppLanguage): void {
  const cabinetIds = new Set(project.cabinets.map((cabinet) => cabinet.id));
  const totals = calculateProjectTotals(project, libraries);
  const powerMetrics = calculatePowerLineMetrics(project, libraries);
  let y = drawHeader(pdf, project, `RELAZIONE TECNICA - ${projectCanvases(project)[0].name}`, false);

  y = drawSectionTitle(pdf, "Riepilogo canvas", y);
  y = drawKeyValues(
    pdf,
    [
      ["Canvas", `${project.canvasWidth} x ${project.canvasHeight} px`],
      ["Pixel attivi in pixelmap", formatInt(totals.pixels)],
      ["Assorbimento massimo", `${formatDecimal(totals.maxW / 1000)} kW`],
      ["Assorbimento medio", `${formatDecimal(totals.averageW / 1000)} kW`],
      ["Peso cabinet", `${formatDecimal(totals.cabinetWeightKg)} kg`],
      ["Peso stimato sospeso", `${formatDecimal(totals.totalEstimatedWeightKg)} kg`],
    ],
    y,
  );

  y = ensureSpace(pdf, project, y, 45);
  y = drawSectionTitle(pdf, "Schermi", y);
  for (const screen of project.screens) {
    const bounds = calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      `${screen.name}: ${Math.round(bounds.width)} x ${Math.round(bounds.height)} px - ` +
        `canvas X ${screen.canvasX}, Y ${screen.canvasY}`,
      15,
      y,
    );
    y += 5;
  }

  for (const controller of project.controllers) {
    y = ensureSpace(pdf, project, y, 48);
    const model = libraries.controllers.find((item) => item.id === controller.modelId);
    if (!model) continue;
    const portMetrics = calculatePortMetrics(project, libraries, controller);
    y = drawSectionTitle(pdf, `Controller - ${controller.name}`, y);
    y = drawKeyValues(
      pdf,
      [
        ["Modello", model.name],
        ["Profilo", `${controller.mode.frameRate} Hz / ${controller.mode.bitDepth} bit`],
      ],
      y,
    );
    for (const metric of portMetrics) {
      y = ensureSpace(pdf, project, y, 7);
      pdf.setFontSize(8.5);
      pdf.text(`Porta ${metric.run.portNumber}: ${metric.run.cabinetIds.filter((id) => cabinetIds.has(id)).length} cabinet`, 18, y);
      y += 4.5;
    }
  }

  y = ensureSpace(pdf, project, y, 36);
  y = drawSectionTitle(pdf, "Distribuzione elettrica", y);
  y = drawKeyValues(pdf, [["Numero linee", String(powerMetrics.length)]], y);
  powerMetrics.forEach((metric) => {
    y = ensureSpace(pdf, project, y, 7);
    pdf.setFontSize(8.5);
    pdf.text(
      `Linea ${metric.line.lineNumber}: ${metric.line.cabinetIds.filter((id) => cabinetIds.has(id)).length} cabinet - ` +
        `${formatDecimal(metric.maxW / 1000)} kW massimo - ` +
        `${formatDecimal(metric.averageW / 1000)} kW medio`,
      18,
      y,
    );
    y += 4.5;
  });

  const supportPlates = project.screens.flatMap((screen) =>
    screen.supportPlates.map((plate) => ({ screen, plate })),
  );

  y = ensureSpace(pdf, project, y, 50);
  y = drawSectionTitle(pdf, "Distinta materiali", y);
  const quantities = new Map<string, number>();
  project.cabinets.forEach((cabinet) => quantities.set(cabinet.modelId, (quantities.get(cabinet.modelId) ?? 0) + 1));
  quantities.forEach((quantity, modelId) => {
    const model = libraries.cabinets.find((item) => item.id === modelId);
    pdf.setFontSize(9);
    pdf.text(`${quantity} x ${model?.manufacturer ?? ""} ${model?.name ?? modelId}`, 18, y);
    y += 5;
  });
  project.controllers.forEach((controller) => {
    const model = libraries.controllers.find((item) => item.id === controller.modelId);
    pdf.text(`1 x ${model?.manufacturer ?? "NovaStar"} ${model?.name ?? controller.modelId}`, 18, y);
    y += 5;
  });
  const simplePlates = supportPlates.filter(({ plate }) => plate.type === "simple").length;
  const aliscafPlates = supportPlates.filter(({ plate }) => plate.type === "aliscaf").length;
  if (simplePlates) {
    pdf.text(`${simplePlates} x piastra di sostegno semplice`, 18, y);
    y += 5;
  }
  if (aliscafPlates) {
    pdf.text(`${aliscafPlates} x piastra con aliscaf per truss`, 18, y);
    y += 5;
  }
  const flybarQuantities = new Map<string, number>();
  project.screens.flatMap((screen) => screen.flybars).forEach((flybar) =>
    flybarQuantities.set(flybar.modelId, (flybarQuantities.get(flybar.modelId) ?? 0) + 1),
  );
  flybarQuantities.forEach((quantity, modelId) => {
    const model = libraries.flybars.find((item) => item.id === modelId);
    pdf.text(`${quantity} x flybar ${model?.manufacturer ?? ""} ${model?.name ?? modelId}`, 18, y);
    y += 5;
  });

  y = ensureSpace(pdf, project, y, 24);
  pdf.setDrawColor(210, 154, 55);
  pdf.setFillColor(255, 248, 229);
  pdf.roundedRect(14, y, 182, 18, 2, 2, "FD");
  pdf.setTextColor(80, 58, 18);
  pdf.setFontSize(8);
  pdf.text(
    "Le stime di peso e distribuzione non costituiscono un calcolo strutturale certificato. " +
      "Verificare sempre rigging, portate e condizioni reali con un tecnico abilitato.",
    18,
    y + 6,
    { maxWidth: 174 },
  );

  const allFlybarMetrics = calculateFlybarMetrics(project, libraries);
  project.screens.forEach((screen) => {
    const screenCabinets = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
    if (!screenCabinets.length) return;
    pdf.addPage("a4", "landscape");
    drawHeader(pdf, project, `RIGGING - ${projectCanvases(project)[0].name} / ${screen.name}`, false);
    const canvas = renderRiggingCanvas(project, libraries, screen, language);
    const maxWidth = 269;
    const maxHeight = 135;
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const imageWidth = canvas.width * ratio;
    const imageHeight = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 14 + (maxWidth - imageWidth) / 2, 29, imageWidth, imageHeight, undefined, "FAST");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Peso totale per flybar", 14, 170);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const screenMetrics = allFlybarMetrics.filter((metric) => screen.flybars.some((flybar) => flybar.id === metric.flybar.id));
    if (!screenMetrics.length) {
      pdf.text("Nessuna flybar inserita. Le piastre sono evidenziate nel disegno.", 14, 176);
    } else {
      screenMetrics.forEach((metric, index) => {
        const column = Math.floor(index / 7);
        const row = index % 7;
        if (column > 2) return;
        const rowY = 176 + row * 4;
        const rowX = 14 + column * 90;
        const totalFlybarWeightKg = metric.supportedLoadKg + metric.flybarWeightKg;
        pdf.text(
          `${metric.flybar.label}: ${formatDecimal(totalFlybarWeightKg)} kg`,
          rowX,
          rowY,
          { maxWidth: 84 },
        );
      });
    }
  });
}

export function createWiringPdf(
  project: LedwallProject,
  libraries: AppLibraries,
  language: AppLanguage = "it",
  canvasId?: string,
): Uint8Array {
  project = canvasProject(project, canvasId);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  localizePdf(pdf, language);
  appendWiringReport(pdf, project, libraries, language);
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

function appendWiringReport(pdf: jsPDF, project: LedwallProject, libraries: AppLibraries, language: AppLanguage): void {
  let pageIndex = 0;
  project.screens.forEach((screen) => {
    const screenCabinets = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
    (["data", "power"] as const).forEach((mode) => {
      if (pageIndex > 0) pdf.addPage("a3", "landscape");
      pageIndex += 1;
      drawHeader(pdf, project, `${mode === "data" ? "CABLAGGIO DATI" : "CABLAGGIO ELETTRICO"} - ${projectCanvases(project)[0].name} / ${screen.name}`);
      if (!screenCabinets.length) {
        pdf.setFontSize(14);
        pdf.text("Nessun cabinet nello schermo.", 18, 40);
        return;
      }
      const canvas = renderWiringCanvas(project, libraries, screen, mode, language);
      const legend = wiringLegend(project, libraries, screen.id, mode, language);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      const blocks = legend.rows.map((row) => pdf.splitTextToSize(row, 184) as string[]);
      const rowsPerColumn = Math.ceil(blocks.length / 2);
      const heightOf = (items: string[][]) => items.reduce((total, lines) => total + lines.length * 4 + 3, 8);
      const legendHeight = Math.max(heightOf(blocks.slice(0, rowsPerColumn)), heightOf(blocks.slice(rowsPerColumn)));
      const separateLegend = legendHeight > 160;
      const maxWidth = 388;
      const maxHeight = separateLegend ? 235 : 237 - legendHeight;
      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 15 + (maxWidth - imageWidth) / 2, 30, imageWidth, imageHeight, undefined, "FAST");
      if (!separateLegend) {
        const legendY = 30 + imageHeight + 8;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(legend.heading, 15, legendY);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        for (let column = 0; column < 2; column += 1) {
          let rowY = legendY + 6;
          blocks.slice(column * rowsPerColumn, (column + 1) * rowsPerColumn).forEach((lines) => {
            pdf.text(lines, 15 + column * 194, rowY, { lineHeightFactor: 1.4 });
            rowY += lines.length * 4 + 3;
          });
        }
      } else {
        let legendY = 290;
        legend.rows.forEach((row) => {
          const lines = pdf.splitTextToSize(row, 388) as string[];
          if (legendY + lines.length * 4 > 281) {
            pdf.addPage("a3", "landscape");
            pageIndex += 1;
            drawHeader(pdf, project, legend.heading);
            legendY = 37;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
          }
          pdf.text(lines, 15, legendY, { lineHeightFactor: 1.4 });
          legendY += lines.length * 4 + 3;
        });
      }
    });
  });
}

export function createTechnicalBatchPdf(project: LedwallProject, libraries: AppLibraries, screenIds: string[], language: AppLanguage = "it"): Uint8Array {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  localizePdf(pdf, language);
  selectedCanvasProjects(project, screenIds).forEach((scope, index) => {
    if (index) pdf.addPage("a4", "portrait");
    appendTechnicalReport(pdf, scope, libraries, language);
  });
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

export function createWiringBatchPdf(project: LedwallProject, libraries: AppLibraries, screenIds: string[], language: AppLanguage = "it"): Uint8Array {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  localizePdf(pdf, language);
  selectedCanvasProjects(project, screenIds).forEach((scope, index) => {
    if (index) pdf.addPage("a3", "landscape");
    appendWiringReport(pdf, scope, libraries, language);
  });
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

export async function createPixelmapPdf(project: LedwallProject, libraries: AppLibraries, screenIds: string[], language: AppLanguage = "it", onProgress?: (completed: number, total: number) => void): Promise<Uint8Array> {
  const scopes = selectedCanvasProjects(project, screenIds);
  const total = scopes.reduce((sum, scope) => sum + scope.screens.length, 0);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  localizePdf(pdf, language);
  let completed = 0;
  for (const scope of scopes) {
    for (const screen of scope.screens) {
      const rendered = await renderScreenPixelmap(scope, libraries, screen);
      const orientation = rendered.canvas.width >= rendered.canvas.height ? "landscape" : "portrait";
      if (completed) pdf.addPage("a3", orientation);
      else if (orientation === "portrait") { pdf.deletePage(1); pdf.addPage("a3", orientation); }
      drawHeader(pdf, scope, `PIXELMAP - ${projectCanvases(scope)[0].name} / ${screen.name}`, false);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - 30;
      const maxHeight = pageHeight - 65;
      const ratio = Math.min(maxWidth / rendered.canvas.width, maxHeight / rendered.canvas.height);
      const width = rendered.canvas.width * ratio;
      const height = rendered.canvas.height * ratio;
      pdf.addImage(rendered.canvas.toDataURL("image/png"), "PNG", (pageWidth - width) / 2, 33 + (maxHeight - height) / 2, width, height, undefined, "FAST");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`${rendered.canvas.width} x ${rendered.canvas.height} px - Canvas X ${screen.canvasX}, Y ${screen.canvasY}`, 15, pageHeight - 20);
      rendered.canvas.width = 1;
      rendered.canvas.height = 1;
      onProgress?.(++completed, total);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

function localizePdf(pdf: jsPDF, language: AppLanguage): void {
  if (language === "it") return;
  const original = pdf.text.bind(pdf) as (...args: unknown[]) => jsPDF;
  pdf.text = ((content: string | string[], ...args: unknown[]) =>
    original(
      Array.isArray(content)
        ? content.map((line) => translateText(line, language))
        : translateText(content, language),
      ...args,
    )) as typeof pdf.text;
}

function wiringLegend(
  project: LedwallProject,
  libraries: AppLibraries,
  screenId: string,
  mode: "data" | "power",
  language: AppLanguage,
): { heading: string; rows: string[] } {
  const screenIds = new Set(project.cabinets.filter((cabinet) => cabinet.screenId === screenId).map((cabinet) => cabinet.id));
  if (mode === "power") {
    return {
      heading: language === "en" ? `Power lines - ${project.electrical.voltageV} V single-phase` : `Linee elettriche - ${project.electrical.voltageV} V monofase`,
      rows: calculatePowerLineMetrics(project, libraries).filter((metric) => metric.line.cabinetIds.some((id) => screenIds.has(id))).map((metric) =>
        `L-${metric.line.lineNumber}: ${formatDecimal(metric.maxW / 1000)} kW max - ${formatDecimal(metric.maxA)} A - ${formatDecimal(metric.utilizationPercent)}% - ${metric.valid ? "OK" : language === "en" ? "OVER LIMIT" : "OLTRE LIMITE"}`,
      ),
    };
  }
  const controller = project.controllers[0];
  const model = libraries.controllers.find((item) => item.id === controller?.modelId);
  const metrics = controller ? calculatePortMetrics(project, libraries, controller) : [];
  const rows = controller?.portRuns.filter((run) => run.cabinetIds.some((id) => screenIds.has(id))).map(
    (run) => {
      const metric = metrics.find((item) => item.run.id === run.id);
      const load = metric
        ? ` | ${language === "en" ? "load" : "carico"} ${formatInt(metric.loadingPixels)} px (${formatDecimal(metric.utilizationPercent)}%` +
          `${metric.virtualPixels ? `, ${formatInt(metric.virtualPixels)} ${language === "en" ? "virtual" : "virtuali"}` : ""})`
        : "";
      return `Main P-${run.portNumber} -> ${language === "en" ? "internal backup" : "backup interno"} P-${run.backupPortNumber ?? (language === "en" ? "N/A" : "N/D")} | ` +
        `${run.backupControllerName ?? (language === "en" ? "backup controller not specified" : "backup controller non definito")}${load}`;
    },
  );
  return { heading: `Backup - ${controller?.name ?? "N/D"} (${model?.name ?? "N/D"})`, rows: rows ?? [] };
}

function drawHeader(
  pdf: jsPDF,
  project: LedwallProject,
  title: string,
  includeClient = true,
): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(18, 25, 34);
  pdf.rect(0, 0, pageWidth, 23, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setFontSize(Math.min(16, 16 * (pageWidth - 24) / Math.max(1, pdf.getTextWidth(title))));
  pdf.text(title.toUpperCase(), 14, 10);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    includeClient
      ? `${project.metadata.projectName} | ${project.metadata.client || "Cliente N/D"} | Rev. ${project.metadata.revision}`
      : `${project.metadata.projectName} | Rev. ${project.metadata.revision}`,
    14,
    17,
  );
  pdf.text(
    [project.metadata.company, project.metadata.date].filter(Boolean).join(" - "),
    pageWidth - 14,
    17,
    { align: "right" },
  );
  pdf.setTextColor(20, 28, 36);
  return 32;
}

function drawSectionTitle(pdf: jsPDF, title: string, y: number): number {
  pdf.setFillColor(227, 234, 242);
  pdf.roundedRect(14, y - 4, 182, 8, 1.5, 1.5, "F");
  pdf.setTextColor(21, 38, 53);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(title, 17, y + 1);
  return y + 9;
}

function drawKeyValues(pdf: jsPDF, entries: [string, string][], y: number): number {
  pdf.setFontSize(8.5);
  entries.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column === 0 ? 17 : 107;
    const valueX = column === 0 ? 64 : 150;
    const rowY = y + row * 6;
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, x, rowY);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, valueX, rowY);
  });
  return y + Math.ceil(entries.length / 2) * 6 + 3;
}

function ensureSpace(pdf: jsPDF, project: LedwallProject, y: number, required: number): number {
  if (y + required < pdf.internal.pageSize.getHeight() - 16) return y;
  pdf.addPage();
  return drawHeader(pdf, project, `RELAZIONE TECNICA - ${projectCanvases(project)[0].name}`, false);
}

function addPageNumbers(pdf: jsPDF): void {
  const pageCount = pdf.getNumberOfPages();
  for (let index = 1; index <= pageCount; index += 1) {
    pdf.setPage(index);
    pdf.setTextColor(90, 100, 110);
    pdf.setFontSize(7);
    pdf.text(
      `Ledwall Designer - pagina ${index}/${pageCount}`,
      pdf.internal.pageSize.getWidth() - 12,
      pdf.internal.pageSize.getHeight() - 7,
      { align: "right" },
    );
  }
}

function formatInt(value: number): string {
  return new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 1 }).format(value);
}
