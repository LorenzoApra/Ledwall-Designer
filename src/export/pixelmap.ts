import { calculateScreenPixelBounds, cabinetPixelSize } from "../domain/geometry";
import type { AppLibraries, LedScreen, LedwallProject } from "../domain/types";

const CABINET_COLORS = ["#4f0b4e", "#006262", "#5c5c00", "#00165c", "#006006", "#650900"];

export interface RenderedPixelmap {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  label: string;
}

export async function renderMasterPixelmap(
  project: LedwallProject,
  libraries: AppLibraries,
): Promise<RenderedPixelmap> {
  const canvas = createCanvas(project.canvasWidth, project.canvasHeight);
  const context = requireContext(canvas);
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const screen of project.screens) {
    await drawScreenPattern(context, project, libraries, screen, screen.canvasX, screen.canvasY);
  }
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    label: `${project.metadata.projectName} ${canvas.width}x${canvas.height}`,
  };
}

export async function renderScreenPixelmap(
  project: LedwallProject,
  libraries: AppLibraries,
  screen: LedScreen,
): Promise<RenderedPixelmap> {
  const bounds = calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets);
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Lo schermo selezionato non contiene cabinet.");
  }
  const canvas = createCanvas(Math.ceil(bounds.width), Math.ceil(bounds.height));
  const context = requireContext(canvas);
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await drawScreenPattern(context, project, libraries, screen, -bounds.x, -bounds.y);
  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    label: `${screen.name} ${canvas.width}x${canvas.height}`,
  };
}

async function drawScreenPattern(
  context: CanvasRenderingContext2D,
  project: LedwallProject,
  libraries: AppLibraries,
  screen: LedScreen,
  originX: number,
  originY: number,
): Promise<void> {
  const modelById = new Map(libraries.cabinets.map((model) => [model.id, model]));
  const cabinets = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
  const bounds = calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets);
  if (bounds.width <= 0 || bounds.height <= 0) return;
  const left = originX + bounds.x;
  const top = originY + bounds.y;
  const options = screen.pixelmap;

  context.save();
  context.beginPath();
  context.rect(left, top, bounds.width, bounds.height);
  context.clip();

  for (const cabinet of cabinets) {
    const model = modelById.get(cabinet.modelId);
    if (!model) continue;
    const size = cabinetPixelSize(cabinet, model);
    const x = originX + cabinet.pixelX;
    const y = originY + cabinet.pixelY;
    context.fillStyle = CABINET_COLORS[(cabinet.row + cabinet.column) % CABINET_COLORS.length];
    context.fillRect(x, y, size.width, size.height);
    if (options.showGrid) {
      context.strokeStyle = "#ffffff";
      context.lineWidth = Math.max(1, Math.min(size.width, size.height) / 80);
      context.strokeRect(x, y, size.width, size.height);
    }
    if (options.showCoordinates) {
      const fontSize = Math.max(9, Math.min(28, Math.min(size.width, size.height) * 0.18));
      context.fillStyle = "#fff";
      context.font = `700 ${fontSize}px Arial, sans-serif`;
      context.textBaseline = "top";
      context.fillText(`${cabinet.row},${cabinet.column}`, x + 3, y + 1);
    }
  }

  const lineWidth = Math.max(1, Math.min(bounds.width, bounds.height) / 600);
  if (options.showDiagonals) {
    context.lineWidth = lineWidth;
    context.strokeStyle = "#00e5ff";
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(left + bounds.width, top + bounds.height);
    context.moveTo(left + bounds.width, top);
    context.lineTo(left, top + bounds.height);
    context.stroke();
  }
  if (options.showCircles) drawCircles(context, left, top, bounds.width, bounds.height, lineWidth);
  if (options.showColorBars || options.showGrayscale) {
    drawBars(context, left, top, bounds.width, bounds.height, options.showColorBars, options.showGrayscale);
  }
  if (options.showScreenName) {
    const fontSize = Math.max(22, Math.min(bounds.width / Math.max(5, screen.name.length * 0.62), bounds.height / 7));
    context.font = `900 ${fontSize}px Arial, sans-serif`;
    context.fillStyle = "#e7c31e";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(screen.name.toUpperCase(), left + bounds.width / 2, top + bounds.height * 0.36);
  }
  if (options.showResolution) {
    const fontSize = Math.max(10, Math.min(30, bounds.width / 28));
    context.font = `700 ${fontSize}px Arial, sans-serif`;
    context.fillStyle = "#e7c31e";
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText(`${Math.round(bounds.width)}x${Math.round(bounds.height)}`, left + 3, top + bounds.height - 2);
  }
  if (options.showLogo && project.metadata.logoDataUrl) {
    const image = await loadImage(project.metadata.logoDataUrl);
    const maxWidth = bounds.width * 0.18;
    const maxHeight = bounds.height * 0.12;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    context.globalAlpha = 0.72;
    context.drawImage(
      image,
      left + bounds.width - image.width * scale - 8,
      top + bounds.height - image.height * scale - 8,
      image.width * scale,
      image.height * scale,
    );
    context.globalAlpha = 1;
  }
  context.restore();
}

function drawCircles(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number,
): void {
  const radius = Math.min(width, height) * 0.25;
  const positions = [
    [x + radius, y + radius, "#ff3b30"],
    [x + width - radius, y + radius, "#1aff42"],
    [x + width / 2, y + height / 2, "#ffffff"],
    [x + radius, y + height - radius, "#006cff"],
    [x + width - radius, y + height - radius, "#fff100"],
  ] as const;
  context.lineWidth = lineWidth;
  for (const [cx, cy, color] of positions) {
    context.strokeStyle = color;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawBars(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: boolean,
  grayscale: boolean,
): void {
  const barWidth = width * 0.76;
  const barHeight = height * 0.16;
  const left = x + (width - barWidth) / 2;
  const top = y + height * 0.42;
  if (color) {
    const colors = ["#777", "#ddd", "#d7d700", "#00bebe", "#00b900", "#bd35bd", "#b91010", "#0038c6"];
    colors.forEach((fill, index) => {
      context.fillStyle = fill;
      context.fillRect(left + (barWidth / colors.length) * index, top, barWidth / colors.length + 1, barHeight / 2);
    });
  }
  if (grayscale) {
    const gradient = context.createLinearGradient(left, 0, left + barWidth, 0);
    gradient.addColorStop(0, "#000");
    gradient.addColorStop(0.5, "#888");
    gradient.addColorStop(1, "#fff");
    context.fillStyle = gradient;
    context.fillRect(left, top + barHeight / 2, barWidth, barHeight / 2);
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D non disponibile.");
  return context;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Logo non leggibile"));
    image.src = source;
  });
}

