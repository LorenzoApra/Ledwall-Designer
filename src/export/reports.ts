import { jsPDF } from "jspdf";
import { calculateControllerCapacity, calculatePortMetrics } from "../domain/capacity";
import { calculatePowerLineMetrics } from "../domain/electrical";
import { calculateScreenPixelBounds } from "../domain/geometry";
import { calculateProjectTotals } from "../domain/projectMetrics";
import { calculateSuspensionMetrics } from "../domain/weight";
import type { AppLibraries, LedwallProject } from "../domain/types";
import { renderWiringCanvas } from "./wiringCanvas";

export function createTechnicalPdf(
  project: LedwallProject,
  libraries: AppLibraries,
): Uint8Array {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const totals = calculateProjectTotals(project, libraries);
  const powerMetrics = calculatePowerLineMetrics(project, libraries);
  const suspensionMetrics = calculateSuspensionMetrics(project, libraries);
  let y = drawHeader(pdf, project, "RELAZIONE TECNICA");

  y = drawSectionTitle(pdf, "Riepilogo progetto", y);
  y = drawKeyValues(
    pdf,
    [
      ["Canvas", `${project.canvasWidth} x ${project.canvasHeight} px`],
      ["Schermi", String(totals.screenCount)],
      ["Cabinet", String(totals.cabinetCount)],
      ["Pixel totali", formatInt(totals.pixels)],
      ["Potenza media", `${formatDecimal(totals.averageW / 1000)} kW`],
      ["Potenza massima", `${formatDecimal(totals.maxW / 1000)} kW`],
      ["Peso cabinet", `${formatDecimal(totals.cabinetWeightKg)} kg`],
      ["Peso stimato sospeso", `${formatDecimal(totals.totalEstimatedWeightKg)} kg`],
    ],
    y,
  );

  y = ensureSpace(pdf, project, y, 45);
  y = drawSectionTitle(pdf, "Schermi", y);
  for (const screen of project.screens) {
    const bounds = calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets);
    const count = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id).length;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      `${screen.name}: ${Math.round(bounds.width)} x ${Math.round(bounds.height)} px - ` +
        `${count} cabinet - canvas X ${screen.canvasX}, Y ${screen.canvasY}`,
      15,
      y,
    );
    y += 5;
  }

  for (const controller of project.controllers) {
    y = ensureSpace(pdf, project, y, 48);
    const model = libraries.controllers.find((item) => item.id === controller.modelId);
    if (!model) continue;
    const capacity = calculateControllerCapacity(model, controller);
    const portMetrics = calculatePortMetrics(project, libraries, controller);
    y = drawSectionTitle(pdf, `Controller - ${controller.name}`, y);
    y = drawKeyValues(
      pdf,
      [
        ["Modello", model.name],
        ["Profilo", `${controller.mode.frameRate} Hz / ${controller.mode.bitDepth} bit`],
        ["Capacita porta", `${formatInt(capacity.portCapacityPixels)} px`],
        ["Capacita totale", `${formatInt(capacity.totalCapacityPixels)} px`],
      ],
      y,
    );
    for (const metric of portMetrics) {
      y = ensureSpace(pdf, project, y, 7);
      pdf.setFontSize(8.5);
      pdf.setTextColor(metric.valid ? 25 : 190, metric.valid ? 45 : 30, metric.valid ? 55 : 30);
      pdf.text(
        `Porta ${metric.run.portNumber}: ${formatInt(metric.pixels)} px - ` +
          `${formatDecimal(metric.utilizationPercent)}% - backup ${metric.run.backupPortNumber ?? "N/D"}`,
        18,
        y,
      );
      y += 4.5;
    }
    pdf.setTextColor(20, 28, 36);
  }

  y = ensureSpace(pdf, project, y, 52);
  y = drawSectionTitle(pdf, "Distribuzione elettrica", y);
  y = drawKeyValues(
    pdf,
    [
      ["Alimentazione", `${project.electrical.voltageV} V monofase`],
      ["Protezione", `${project.electrical.breakerA} A`],
      ["Utilizzo massimo", `${project.electrical.utilizationPercent}%`],
      ["Numero linee", String(powerMetrics.length)],
    ],
    y,
  );
  powerMetrics.forEach((metric) => {
    y = ensureSpace(pdf, project, y, 7);
    pdf.setFontSize(8.5);
    pdf.text(
      `Linea ${metric.line.lineNumber}: ${formatInt(metric.maxW)} W max / ` +
        `${formatInt(metric.averageW)} W medi - ${formatDecimal(metric.maxA)} A - ` +
        `${formatDecimal(metric.utilizationPercent)}%`,
      18,
      y,
    );
    y += 4.5;
  });

  y = ensureSpace(pdf, project, y, 50);
  y = drawSectionTitle(pdf, "Carichi ai punti di sospensione", y);
  suspensionMetrics.forEach((metric) => {
    y = ensureSpace(pdf, project, y, 7);
    pdf.setFontSize(8.5);
    pdf.text(
      `${metric.point.label}: ${formatDecimal(metric.totalWeightKg)} kg ` +
        `(${formatDecimal(metric.cabinetWeightKg)} kg cabinet + ` +
        `${formatDecimal(metric.estimatedAccessoryWeightKg)} kg stimati)`,
      18,
      y,
    );
    y += 4.5;
  });

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
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

export function createWiringPdf(
  project: LedwallProject,
  libraries: AppLibraries,
): Uint8Array {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  project.screens.forEach((screen, screenIndex) => {
    if (screenIndex > 0) pdf.addPage("a3", "landscape");
    drawHeader(pdf, project, `CABLAGGIO DATI - ${screen.name}`);
    const screenCabinets = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
    if (screenCabinets.length === 0) {
      pdf.setFontSize(14);
      pdf.text("Nessun cabinet nello schermo.", 18, 40);
      return;
    }
    const canvas = renderWiringCanvas(project, libraries, screen);
    const maxWidth = 388;
    const maxHeight = 245;
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const imageWidth = canvas.width * ratio;
    const imageHeight = canvas.height * ratio;
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      15 + (maxWidth - imageWidth) / 2,
      30,
      imageWidth,
      imageHeight,
      undefined,
      "FAST",
    );
    drawBackupTable(pdf, project, libraries, 15, 282);
  });
  addPageNumbers(pdf);
  return new Uint8Array(pdf.output("arraybuffer"));
}

function drawBackupTable(
  pdf: jsPDF,
  project: LedwallProject,
  libraries: AppLibraries,
  x: number,
  y: number,
): void {
  const controller = project.controllers[0];
  const model = libraries.controllers.find((item) => item.id === controller?.modelId);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(`Backup - ${controller?.name ?? "N/D"} (${model?.name ?? "N/D"})`, x, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  const rows = controller?.portRuns.map(
    (run) =>
      `Main P-${run.portNumber} -> backup interno P-${run.backupPortNumber ?? "N/D"} | ` +
      `${run.backupControllerName ?? "backup controller non definito"}`,
  );
  (rows ?? []).slice(0, 8).forEach((row, index) => pdf.text(row, x, y + 5 + index * 4));
}

function drawHeader(pdf: jsPDF, project: LedwallProject, title: string): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(18, 25, 34);
  pdf.rect(0, 0, pageWidth, 23, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title.toUpperCase(), 14, 10);
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `${project.metadata.projectName} | ${project.metadata.client || "Cliente N/D"} | Rev. ${project.metadata.revision}`,
    14,
    17,
  );
  pdf.text(`${project.metadata.company} - ${project.metadata.date}`, pageWidth - 14, 17, { align: "right" });
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
    const valueX = x + (column === 0 ? 32 : 43);
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
  return drawHeader(pdf, project, "RELAZIONE TECNICA");
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
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value);
}
