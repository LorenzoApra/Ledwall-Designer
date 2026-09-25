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
  const scale = Math.max(1.25, Math.min(3, 1900 / Math.max(bounds.width, bounds.height)));
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
    context.font = `600 ${Math.max(10, Math.min(17, 9 * scale))}px Arial, sans-serif`;
    context.textBaseline = "top";
    const lines = assignment
      ? mode === "data" ? [
          `C-1`,
          `P-${assignment.number}`,
          `RV-${assignment.order + 1}`,
          `A-${cabinet.rotation}deg`,
          `WH-${size.width}x${size.height}`,
        ] : [
          `L-${assignment.number}`,
          `ORD-${assignment.order + 1}`,
          `${cabinet.row},${cabinet.column}`,
          `${model.powerMaxW}W max`,
        ]
      : [`${cabinet.row},${cabinet.column}`, language === "en" ? "UNASSIGNED" : "NON ASSEGNATO"];
    lines.forEach((line, index) => context.fillText(line, x + 4, y + 3 + index * Math.max(11, 10 * scale)));
  }

  const connectionRuns = mode === "data"
    ? (controller?.portRuns ?? []).map((run) => ({ number: run.portNumber, ids: run.cabinetIds, color: "#063cff" }))
    : project.powerLines.map((line) => ({ number: line.lineNumber, ids: line.cabinetIds, color: line.color }));
  connectionRuns.forEach((run) => {
    const points = run.ids
      .map((id) => {
        const cabinet = cabinetById.get(id);
        const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
        if (!cabinet || !model || cabinet.screenId !== screen.id) return undefined;
        const center = cabinetPixelCenter(cabinet, model);
        return { x: toX(center.x), y: toY(center.y) };
      })
      .filter((point): point is { x: number; y: number } => point !== undefined);
    if (points.length === 0) return;
    context.fillStyle = run.color;
    context.lineCap = "round";
    context.lineJoin = "round";
    const lineWidth = Math.max(6, 3 * scale);
    tracePath(context, points);
    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.lineWidth = lineWidth + Math.max(4, 2 * scale);
    context.stroke();
    tracePath(context, points);
    context.strokeStyle = run.color;
    context.lineWidth = lineWidth;
    context.stroke();
    points.slice(1).forEach((point, index) => drawArrow(context, points[index], point, scale));
    drawEndpoint(context, points[0], "#32f54f", mode === "data" ? String(run.number) : `L${run.number}`, scale);
    drawEndpoint(context, points.at(-1)!, "#ff173d", "", scale);
  });

  context.fillStyle = "#121a22";
  context.font = "700 22px Arial, sans-serif";
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
  scale: number,
): void {
  const radius = Math.max(7, 5 * scale);
  context.fillStyle = color;
  context.strokeStyle = "#003cff";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  if (label) {
    context.fillStyle = "#003cff";
    context.font = `700 ${Math.max(10, 8 * scale)}px Arial, sans-serif`;
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
  scale: number,
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = Math.max(12, 7 * scale);
  const x = from.x + (to.x - from.x) * 0.68;
  const y = from.y + (to.y - from.y) * 0.68;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  context.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.strokeStyle = "#ffffff";
  context.lineWidth = Math.max(2.5, 1.25 * scale);
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
