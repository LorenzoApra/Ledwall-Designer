import { calculateFlybarMetrics } from "../domain/flybars";
import { cabinetPhysicalSize } from "../domain/geometry";
import type { AppLibraries, LedScreen, LedwallProject } from "../domain/types";

export function renderRiggingCanvas(
  project: LedwallProject,
  libraries: AppLibraries,
  screen: LedScreen,
): HTMLCanvasElement {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const items = project.cabinets
    .filter((cabinet) => cabinet.screenId === screen.id)
    .map((cabinet) => {
      const model = modelById.get(cabinet.modelId);
      if (!model) return undefined;
      const size = cabinetPhysicalSize(cabinet, model);
      return { cabinet, size };
    })
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  if (!items.length) throw new Error("Lo schermo non contiene cabinet.");

  const minX = Math.min(...items.map(({ cabinet }) => cabinet.physicalXmm));
  const minY = Math.min(...items.map(({ cabinet }) => cabinet.physicalYmm));
  const maxX = Math.max(...items.map(({ cabinet, size }) => cabinet.physicalXmm + size.width));
  const maxY = Math.max(...items.map(({ cabinet, size }) => cabinet.physicalYmm + size.height));
  const widthMm = maxX - minX;
  const heightMm = maxY - minY;
  const scale = Math.max(0.18, Math.min(1.2, 1600 / Math.max(widthMm, heightMm)));
  const margin = 100;
  const footer = 90;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(widthMm * scale + margin * 2);
  canvas.height = Math.ceil(heightMm * scale + margin * 2 + footer);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D non disponibile.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const toX = (value: number) => margin + (value - minX) * scale;
  const toY = (value: number) => margin + (value - minY) * scale;

  items.forEach(({ cabinet, size }) => {
    const x = toX(cabinet.physicalXmm);
    const y = toY(cabinet.physicalYmm);
    context.fillStyle = cabinet.excludeFromPixelmap ? "#d8dde1" : "#e8eef2";
    context.strokeStyle = "#344755";
    context.lineWidth = 1.5;
    context.fillRect(x, y, size.width * scale, size.height * scale);
    context.strokeRect(x, y, size.width * scale, size.height * scale);
    context.fillStyle = "#243541";
    context.font = `700 ${Math.max(10, 13 * scale)}px Arial, sans-serif`;
    context.fillText(`${cabinet.row},${cabinet.column}`, x + 4, y + 4);
  });

  screen.supportPlates.forEach((plate, index) => {
    const x = toX(plate.xMm);
    const y = toY(plate.yMm);
    context.fillStyle = plate.type === "aliscaf" ? "#247dad" : "#dc4664";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.fillRect(x - 18, y - 11, 36, 22);
    context.strokeRect(x - 18, y - 11, 36, 22);
    context.fillStyle = "#ffffff";
    context.font = "700 12px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(`${plate.type === "aliscaf" ? "PA" : "PS"}${index + 1}`, x, y + 4);
  });

  const metricById = new Map(calculateFlybarMetrics(project, libraries).map((metric) => [metric.flybar.id, metric]));
  screen.flybars.forEach((flybar) => {
    const metric = metricById.get(flybar.id);
    const model = libraries.flybars.find((item) => item.id === flybar.modelId);
    const x = toX(flybar.xMm);
    const y = toY(flybar.yMm);
    const width = (model?.widthMm ?? 500) * scale;
    context.strokeStyle = metric?.valid ? "#168252" : "#cf334f";
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.stroke();
    context.fillStyle = "#172633";
    context.font = "700 13px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(`${flybar.label} ${metric?.supportedLoadKg.toFixed(1) ?? "0"} kg`, x + width / 2, flybar.mode === "hanging" ? y - 13 : y + 25);
  });
  context.textAlign = "left";
  context.fillStyle = "#172633";
  context.font = "700 22px Arial, sans-serif";
  context.fillText(`RIGGING - ${screen.name}`, margin, canvas.height - footer + 25);
  context.font = "13px Arial, sans-serif";
  context.fillText("Front View - piastre e flybar evidenziate", margin, canvas.height - footer + 52);
  return canvas;
}
