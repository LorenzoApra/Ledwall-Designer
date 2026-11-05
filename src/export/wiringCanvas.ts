import { calculateScreenPixelBounds, cabinetPixelCenter, cabinetPixelSize } from "../domain/geometry";
import type { AppLibraries, LedScreen, LedwallProject } from "../domain/types";
import type { AppLanguage } from "../i18n";

export function renderWiringCanvas(
  project: LedwallProject,
  libraries: AppLibraries,
  screen: LedScreen,
  mode: "data" | "power",
  language: AppLanguage = "it",
): HTMLCanvasElement {
  const bounds = calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets);
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Lo schermo selezionato non contiene cabinet.");
  }
  const scale = Math.min(4, 4200 / Math.max(bounds.width, bounds.height));
  const margin = 48;
  const footer = 80;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale + margin * 2);
  canvas.height = Math.ceil(bounds.height * scale + margin * 2 + footer);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D non disponibile.");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const cabinetById = new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet]));
  const controller = project.controllers[0];
  const assignmentByCabinet = new Map<string, { number: number; order: number; color: string }>();
  if (mode === "data") {
    controller?.portRuns.forEach((run) =>
      run.cabinetIds.forEach((id, order) => assignmentByCabinet.set(id, { number: run.portNumber, order, color: run.color })),
    );
  } else {
    project.powerLines.forEach((line) =>
      line.cabinetIds.forEach((id, order) => assignmentByCabinet.set(id, { number: line.lineNumber, order, color: line.color })),
    );
  }

  const toX = (value: number) => margin + (value - bounds.x) * scale;
  const toY = (value: number) => margin + (value - bounds.y) * scale;
  for (const cabinet of project.cabinets.filter((item) => item.screenId === screen.id)) {
    const model = modelById.get(cabinet.modelId);
    if (!model) continue;
    const size = cabinetPixelSize(cabinet, model);
    const assignment = assignmentByCabinet.get(cabinet.id);
    const x = toX(cabinet.pixelX);
    const y = toY(cabinet.pixelY);
    context.fillStyle = assignment?.color ?? "#eceff3";
    context.globalAlpha = 0.72;
    context.fillRect(x, y, size.width * scale, size.height * scale);
    context.globalAlpha = 1;
    context.strokeStyle = "#1c2530";
    context.lineWidth = 1;
    context.strokeRect(x, y, size.width * scale, size.height * scale);
    context.fillStyle = "#13202b";
    context.textBaseline = "top";
    const cellWidth = size.width * scale;
    const cellHeight = size.height * scale;
    const padding = Math.max(4, Math.min(cellWidth, cellHeight) * 0.025);
    const primaryFont = Math.min(cellWidth * 0.23, cellHeight * 0.20);
    if (assignment) {
      context.font = `900 ${primaryFont}px Arial, sans-serif`;
      context.fillText(`${mode === "data" ? "P" : "L"}-${assignment.number}`, x + padding, y + padding, cellWidth - padding * 2);
    }
    const detailFont = Math.min(cellWidth * 0.07, cellHeight * 0.055);
    context.font = `600 ${detailFont}px Arial, sans-serif`;
    const lines = assignment
      ? mode === "data" ? [
          `C-1 / RV-${assignment.order + 1}`,
          `A-${cabinet.rotation}deg`,
          `WH-${size.width}x${size.height}`,
        ] : [
          `ORD-${assignment.order + 1}`,
          `${cabinet.row},${cabinet.column}`,
          `${model.powerMaxW}W max`,
        ]
      : [`${cabinet.row},${cabinet.column}`, language === "en" ? "UNASSIGNED" : "NON ASSEGNATO"];
    const detailY = assignment ? y + cellHeight * 0.78 : y + padding;
    lines.forEach((line, index) => context.fillText(line, x + padding, detailY + index * detailFont * 1.2, cellWidth - padding * 2));
  }

  const connectionRuns = mode === "data"
    ? (controller?.portRuns ?? []).map((run) => ({ number: run.portNumber, ids: run.cabinetIds, color: "#063cff" }))
    : project.powerLines.map((line) => ({ number: line.lineNumber, ids: line.cabinetIds, color: "#a83c0b" }));
  connectionRuns.forEach((run) => {
    const points = run.ids
      .map((id) => {
        const cabinet = cabinetById.get(id);
        const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
        if (!cabinet || !model || cabinet.screenId !== screen.id) return undefined;
        const center = cabinetPixelCenter(cabinet, model);
        const size = cabinetPixelSize(cabinet, model);
        return { x: toX(center.x), y: toY(center.y), cellSize: Math.min(size.width, size.height) * scale };
      })
      .filter((point): point is { x: number; y: number; cellSize: number } => point !== undefined);
    if (points.length === 0) return;
    context.fillStyle = run.color;
    context.lineCap = "round";
    context.lineJoin = "round";
    const lineWidth = Math.max(4, Math.min(...points.map((point) => point.cellSize)) * 0.025);
    tracePath(context, points);
    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.lineWidth = lineWidth * 2;
    context.stroke();
    tracePath(context, points);
    context.strokeStyle = run.color;
    context.lineWidth = lineWidth;
    context.stroke();
    points.slice(1).forEach((point, index) => drawArrow(context, points[index], point, Math.min(points[index].cellSize, point.cellSize)));
    if (points.length > 1) drawEndpoint(context, points.at(-1)!, "#ff173d", "", points.at(-1)!.cellSize);
    drawEndpoint(context, points[0], "#32f54f", `${mode === "data" ? "P" : "L"}-${run.number}`, points[0].cellSize);
  });

  context.fillStyle = "#121a22";
  context.font = "700 30px Arial, sans-serif";
  context.fillText(`${mode === "data" ? controller?.name ?? "Controller" : language === "en" ? "Power distribution" : "Distribuzione elettrica"} - ${screen.name}`, margin, canvas.height - footer + 18);
  context.font = "13px Arial, sans-serif";
  context.fillText(`Front View - ${mode === "data" ? language === "en" ? "main data route" : "percorso main dati" : language === "en" ? "power lines" : "linee elettriche"}`, margin, canvas.height - footer + 48);
  return canvas;
}

function drawEndpoint(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
  color: string,
  label: string,
  cellSize: number,
): void {
  const fontSize = cellSize * 0.18;
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  const radius = label ? cellSize * 0.24 : Math.max(4, cellSize * 0.055);
  const textWidth = label ? context.measureText(label).width : 0;
  if (textWidth > radius * 1.75) context.font = `900 ${fontSize * radius * 1.75 / textWidth}px Arial, sans-serif`;
  context.fillStyle = color;
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(3, cellSize * 0.018);
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.strokeStyle = "#13202b";
  context.lineWidth = Math.max(1, cellSize * 0.006);
  context.stroke();
  if (label) {
    context.fillStyle = "#10212d";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, point.x, point.y);
    context.textAlign = "left";
  }
}

function drawArrow(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  cellSize: number,
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = Math.max(8, cellSize * 0.10);
  const x = from.x + (to.x - from.x) * 0.68;
  const y = from.y + (to.y - from.y) * 0.68;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  context.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(2, cellSize * 0.012);
  context.stroke();
  context.fill();
}

function tracePath(
  context: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
): void {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
}
