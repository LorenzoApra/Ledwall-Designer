import { calculateScreenPixelBounds, cabinetPixelCenter, cabinetPixelSize } from "../domain/geometry";
import type { AppLibraries, LedScreen, LedwallProject } from "../domain/types";

export function renderWiringCanvas(
  project: LedwallProject,
  libraries: AppLibraries,
  screen: LedScreen,
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
  const runByCabinet = new Map<string, { runIndex: number; order: number }>();
  controller?.portRuns.forEach((run, runIndex) =>
    run.cabinetIds.forEach((id, order) => runByCabinet.set(id, { runIndex, order })),
  );

  const toX = (value: number) => margin + (value - bounds.x) * scale;
  const toY = (value: number) => margin + (value - bounds.y) * scale;
  for (const cabinet of project.cabinets.filter((item) => item.screenId === screen.id)) {
    const model = modelById.get(cabinet.modelId);
    if (!model) continue;
    const size = cabinetPixelSize(cabinet, model);
    const assignment = runByCabinet.get(cabinet.id);
    const run = assignment === undefined ? undefined : controller?.portRuns[assignment.runIndex];
    const x = toX(cabinet.pixelX);
    const y = toY(cabinet.pixelY);
    context.fillStyle = run?.color ?? "#eceff3";
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
      ? [
          `C-1`,
          `P-${run?.portNumber ?? "-"}`,
          `RV-${assignment.order + 1}`,
          `A-${cabinet.rotation}deg`,
          `WH-${size.width}x${size.height}`,
        ]
      : [`${cabinet.row},${cabinet.column}`, "NON ASSEGNATO"];
    lines.forEach((line, index) => context.fillText(line, x + 4, y + 3 + index * Math.max(11, 10 * scale)));
  }

  controller?.portRuns.forEach((run) => {
    const points = run.cabinetIds
      .map((id) => {
        const cabinet = cabinetById.get(id);
        const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
        if (!cabinet || !model || cabinet.screenId !== screen.id) return undefined;
        const center = cabinetPixelCenter(cabinet, model);
        return { x: toX(center.x), y: toY(center.y) };
      })
      .filter((point): point is { x: number; y: number } => point !== undefined);
    if (points.length === 0) return;
    context.strokeStyle = "#063cff";
    context.fillStyle = "#063cff";
    context.lineWidth = Math.max(2, 1.5 * scale);
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
    points.slice(1).forEach((point, index) => drawArrow(context, points[index], point, scale));
    drawEndpoint(context, points[0], "#32f54f", String(run.portNumber), scale);
    drawEndpoint(context, points.at(-1)!, "#ff173d", "", scale);
  });

  context.fillStyle = "#121a22";
  context.font = "700 22px Arial, sans-serif";
  context.fillText(`${controller?.name ?? "Controller"} - ${screen.name}`, margin, canvas.height - footer + 18);
  context.font = "13px Arial, sans-serif";
  context.fillText("Front View - percorso main", margin, canvas.height - footer + 48);
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
  const size = Math.max(7, 5 * scale);
  const x = from.x + (to.x - from.x) * 0.68;
  const y = from.y + (to.y - from.y) * 0.68;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  context.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
}

