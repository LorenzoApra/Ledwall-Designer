import { useMemo, useRef, useState } from "react";
import {
  cabinetPixelCenter,
  cabinetPixelSize,
  calculateScreenPixelBounds,
} from "../domain/geometry";
import { calculateSuspensionMetrics } from "../domain/weight";
import type {
  AppLibraries,
  CabinetInstance,
  LedwallProject,
  ViewMode,
} from "../domain/types";

interface CanvasEditorProps {
  project: LedwallProject;
  libraries: AppLibraries;
  viewMode: ViewMode;
  zoom: number;
  selectedScreenId?: string;
  selectedCabinetId?: string;
  selectedCabinetIds: string[];
  manualTracePort?: number;
  manualPowerLine?: number;
  snap: boolean;
  onSelectScreen: (id?: string) => void;
  onSelectCabinet: (id?: string, additive?: boolean) => void;
  onMoveCabinet: (id: string, pixelX: number, pixelY: number) => void;
  onTraceCabinet: (id: string) => void;
  onTracePowerCabinet: (id: string) => void;
}

interface DragState {
  id: string;
  startPointerX: number;
  startPointerY: number;
  startCabinetX: number;
  startCabinetY: number;
}

const PIXELMAP_COLORS = ["#4f0b4e", "#006262", "#5c5c00", "#00165c", "#006006", "#650900"];

export function CanvasEditor({
  project,
  libraries,
  viewMode,
  zoom,
  selectedScreenId,
  selectedCabinetId,
  selectedCabinetIds,
  manualTracePort,
  manualPowerLine,
  snap,
  onSelectScreen,
  onSelectCabinet,
  onMoveCabinet,
  onTraceCabinet,
  onTracePowerCabinet,
}: CanvasEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const traceLastCabinetId = useRef<string | undefined>(undefined);
  const [drag, setDrag] = useState<DragState>();
  const [traceDragging, setTraceDragging] = useState(false);
  const [tracePointer, setTracePointer] = useState<{ x: number; y: number }>();
  const modelById = useMemo(
    () => new Map(libraries.cabinets.map((model) => [model.id, model])),
    [libraries.cabinets],
  );
  const cabinetById = useMemo(
    () => new Map(project.cabinets.map((cabinet) => [cabinet.id, cabinet])),
    [project.cabinets],
  );
  const selectedCabinetIdSet = useMemo(
    () => new Set(selectedCabinetIds),
    [selectedCabinetIds],
  );
  const controller = project.controllers[0];
  const activeTraceIds = useMemo(() => {
    if (viewMode === "data" && manualTracePort !== undefined) {
      return controller?.portRuns.find((item) => item.portNumber === manualTracePort)?.cabinetIds;
    }
    if (viewMode === "power" && manualPowerLine !== undefined) {
      return project.powerLines.find((item) => item.lineNumber === manualPowerLine)?.cabinetIds;
    }
    return undefined;
  }, [controller?.portRuns, manualPowerLine, manualTracePort, project.powerLines, viewMode]);
  const traceActive =
    (viewMode === "data" && manualTracePort !== undefined) ||
    (viewMode === "power" && manualPowerLine !== undefined);
  const activeTraceEnd = useMemo(() => {
    const cabinet = activeTraceIds
      ? cabinetById.get(activeTraceIds.at(-1) ?? "")
      : undefined;
    const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
    const screen = cabinet ? project.screens.find((item) => item.id === cabinet.screenId) : undefined;
    if (!cabinet || !model || !screen) return undefined;
    const center = cabinetPixelCenter(cabinet, model);
    return { x: screen.canvasX + center.x, y: screen.canvasY + center.y };
  }, [activeTraceIds, cabinetById, modelById, project.screens]);
  const runByCabinet = useMemo(() => {
    const map = new Map<string, { port: number; order: number; color: string }>();
    controller?.portRuns.forEach((run) =>
      run.cabinetIds.forEach((id, order) => map.set(id, { port: run.portNumber, order, color: run.color })),
    );
    return map;
  }, [controller?.portRuns]);
  const powerByCabinet = useMemo(() => {
    const map = new Map<string, { line: number; order: number; color: string }>();
    project.powerLines.forEach((line) =>
      line.cabinetIds.forEach((id, order) => map.set(id, { line: line.lineNumber, order, color: line.color })),
    );
    return map;
  }, [project.powerLines]);
  const suspensionMetrics = useMemo(
    () => calculateSuspensionMetrics(project, libraries),
    [project, libraries],
  );
  const suspensionById = useMemo(
    () => new Map(suspensionMetrics.map((metric) => [metric.point.id, metric])),
    [suspensionMetrics],
  );

  const background = viewMode === "pixelmap" ? "#000" : "#f7f8fa";

  function clientToSvg(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    return matrix ? point.matrixTransform(matrix) : { x: 0, y: 0 };
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>): void {
    if (traceDragging && traceActive) {
      const point = clientToSvg(event.clientX, event.clientY);
      setTracePointer(point);
      const cabinet = cabinetAtPoint(point);
      if (cabinet && cabinet.id !== traceLastCabinetId.current) {
        traceLastCabinetId.current = cabinet.id;
        if (viewMode === "data") onTraceCabinet(cabinet.id);
        if (viewMode === "power") onTracePowerCabinet(cabinet.id);
      }
      return;
    }
    if (!drag) return;
    const point = clientToSvg(event.clientX, event.clientY);
    const cabinet = cabinetById.get(drag.id);
    const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
    if (!cabinet || !model) return;
    let nextX = drag.startCabinetX + point.x - drag.startPointerX;
    let nextY = drag.startCabinetY + point.y - drag.startPointerY;
    if (snap) {
      const size = cabinetPixelSize(cabinet, model);
      nextX = Math.round(nextX / size.width) * size.width;
      nextY = Math.round(nextY / size.height) * size.height;
    }
    onMoveCabinet(drag.id, Math.max(0, Math.round(nextX)), Math.max(0, Math.round(nextY)));
  }

  function cabinetAtPoint(point: { x: number; y: number }): CabinetInstance | undefined {
    return [...project.cabinets].reverse().find((cabinet) => {
      const screen = project.screens.find((item) => item.id === cabinet.screenId);
      const model = modelById.get(cabinet.modelId);
      if (!screen || !model) return false;
      const size = cabinetPixelSize(cabinet, model);
      const x = screen.canvasX + cabinet.pixelX;
      const y = screen.canvasY + cabinet.pixelY;
      return point.x >= x && point.x <= x + size.width && point.y >= y && point.y <= y + size.height;
    });
  }

  function startDrag(event: React.PointerEvent<SVGGElement>, cabinet: CabinetInstance): void {
    event.stopPropagation();
    const point = clientToSvg(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectCabinet(
      cabinet.id,
      event.metaKey || event.ctrlKey || event.shiftKey,
    );
    onSelectScreen(cabinet.screenId);
    if (traceActive) {
      event.preventDefault();
      svgRef.current?.setPointerCapture(event.pointerId);
      traceLastCabinetId.current = cabinet.id;
      if (viewMode === "data") onTraceCabinet(cabinet.id);
      if (viewMode === "power") onTracePowerCabinet(cabinet.id);
      setTraceDragging(true);
      setTracePointer(point);
      return;
    }
    setDrag({
      id: cabinet.id,
      startPointerX: point.x,
      startPointerY: point.y,
      startCabinetX: cabinet.pixelX,
      startCabinetY: cabinet.pixelY,
    });
  }

  return (
    <div className="canvas-scroll">
      <svg
        ref={svgRef}
        className={`design-canvas ${traceActive ? "trace-mode" : ""}`}
        viewBox={`0 0 ${project.canvasWidth} ${project.canvasHeight}`}
        width={project.canvasWidth * zoom}
        height={project.canvasHeight * zoom}
        style={{ background }}
        onPointerMove={handlePointerMove}
        onPointerUp={() => {
          setDrag(undefined);
          setTraceDragging(false);
          setTracePointer(undefined);
          traceLastCabinetId.current = undefined;
        }}
        onPointerCancel={() => {
          setDrag(undefined);
          setTraceDragging(false);
          setTracePointer(undefined);
          traceLastCabinetId.current = undefined;
        }}
        onPointerLeave={() => {
          setDrag(undefined);
          if (!traceDragging) setTracePointer(undefined);
        }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onSelectCabinet(undefined);
            onSelectScreen(undefined);
          }
        }}
      >
        <defs>
          <pattern id="smallGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke={viewMode === "pixelmap" ? "#141414" : "#e7ebef"} strokeWidth="1" />
          </pattern>
          <pattern id="largeGrid" width="128" height="128" patternUnits="userSpaceOnUse">
            <rect width="128" height="128" fill="url(#smallGrid)" />
            <path d="M 128 0 L 0 0 0 128" fill="none" stroke={viewMode === "pixelmap" ? "#272727" : "#d5dce3"} strokeWidth="2" />
          </pattern>
          <marker id="arrow-data" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1746ff" />
          </marker>
          <marker id="arrow-data-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff861c" />
          </marker>
          <marker id="arrow-power" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f07831" />
          </marker>
          <marker id="arrow-power-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff861c" />
          </marker>
        </defs>
        <rect width={project.canvasWidth} height={project.canvasHeight} fill="url(#largeGrid)" />

        {project.screens.map((screen) => {
          const bounds = calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets);
          const screenCabinets = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
          const selected = screen.id === selectedScreenId;
          return (
            <g
              key={screen.id}
              transform={`translate(${screen.canvasX} ${screen.canvasY})`}
              onPointerDown={() => onSelectScreen(screen.id)}
            >
              {bounds.width > 0 && (
                <rect
                  x={bounds.x - 8}
                  y={bounds.y - 8}
                  width={bounds.width + 16}
                  height={bounds.height + 16}
                  fill="none"
                  stroke={selected ? "#f2a93b" : viewMode === "pixelmap" ? "#555" : "#97a6b5"}
                  strokeWidth={selected ? 5 : 2}
                  strokeDasharray={selected ? undefined : "10 8"}
                  pointerEvents="none"
                />
              )}
              <text
                x={bounds.x + 8}
                y={bounds.y + 24}
                fontSize="20"
                fontWeight="800"
                fill={viewMode === "pixelmap" ? "#e9c832" : "#263747"}
                pointerEvents="none"
              >
                {screen.name}
              </text>
              {screenCabinets.map((cabinet) => {
                const model = modelById.get(cabinet.modelId);
                if (!model) return null;
                const size = cabinetPixelSize(cabinet, model);
                const data = runByCabinet.get(cabinet.id);
                const power = powerByCabinet.get(cabinet.id);
                const fill = cabinet.excludeFromPixelmap && viewMode === "pixelmap"
                  ? "#090909"
                  : viewMode === "data"
                    ? data?.color ?? "#e4e8ed"
                    : viewMode === "power"
                      ? power?.color ?? "#e4e8ed"
                      : viewMode === "pixelmap"
                        ? PIXELMAP_COLORS[(cabinet.row + cabinet.column) % PIXELMAP_COLORS.length]
                        : viewMode === "weight"
                          ? "#b8c6d3"
                          : "#dce7ee";
                const lines = cabinetLabels(viewMode, cabinet, size, data, power);
                return (
                  <g
                    key={cabinet.id}
                    className="cabinet-node"
                    transform={`translate(${cabinet.pixelX} ${cabinet.pixelY})`}
                    onPointerDown={(event) => startDrag(event, cabinet)}
                  >
                    <rect
                      width={size.width}
                      height={size.height}
                      fill={fill}
                      fillOpacity={viewMode === "pixelmap" ? 1 : 0.82}
                      stroke={selectedCabinetIdSet.has(cabinet.id) ? "#ff9d20" : cabinet.excludeFromPixelmap && viewMode === "pixelmap" ? "#ff4f6d" : viewMode === "pixelmap" ? "#fff" : "#1d2a35"}
                      strokeWidth={selectedCabinetIdSet.has(cabinet.id) ? 5 : 2}
                      strokeDasharray={cabinet.excludeFromPixelmap ? "10 6" : undefined}
                    />
                    <text x="5" y="17" fontSize="13" fontWeight="700" fill={viewMode === "pixelmap" ? "#fff" : "#10212d"} pointerEvents="none">
                      {lines.map((line, index) => (
                        <tspan key={line} x="5" dy={index === 0 ? 0 : 15}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {viewMode === "data" &&
                controller?.portRuns.map((run) => (
                  <ConnectionRun
                    key={run.id}
                    ids={run.cabinetIds}
                    cabinetById={cabinetById}
                    modelById={modelById}
                    screenId={screen.id}
                    color={run.portNumber === manualTracePort ? "#ff861c" : "#1746ff"}
                    marker={run.portNumber === manualTracePort ? "url(#arrow-data-active)" : "url(#arrow-data)"}
                    startLabel={String(run.portNumber)}
                  />
                ))}
              {viewMode === "power" &&
                project.powerLines.map((line) => (
                  <ConnectionRun
                    key={line.id}
                    ids={line.cabinetIds}
                    cabinetById={cabinetById}
                    modelById={modelById}
                    screenId={screen.id}
                    color={line.lineNumber === manualPowerLine ? "#ff861c" : line.color}
                    marker={line.lineNumber === manualPowerLine ? "url(#arrow-power-active)" : "url(#arrow-power)"}
                    startLabel={`L${line.lineNumber}`}
                  />
                ))}
              {viewMode === "weight" &&
                screen.suspensionPoints.map((point) => {
                  const metric = suspensionById.get(point.id);
                  const screenModels = screenCabinets
                    .map((cabinet) => ({ cabinet, model: modelById.get(cabinet.modelId) }))
                    .filter((item) => item.model);
                  const minY = screenModels.length
                    ? Math.min(...screenModels.map((item) => item.cabinet.pixelY))
                    : 0;
                  const firstModel = screenModels[0]?.model;
                  const pitch = firstModel ? firstModel.pitchMm : 1;
                  const x = point.xMm / pitch;
                  return (
                    <g key={point.id} pointerEvents="none">
                      <line x1={x} y1={Math.max(0, minY - 70)} x2={x} y2={minY} stroke="#cf334f" strokeWidth="5" />
                      <circle cx={x} cy={Math.max(0, minY - 70)} r="14" fill="#cf334f" />
                      <text x={x + 20} y={Math.max(18, minY - 64)} fontSize="18" fontWeight="800" fill="#7b2032">
                        {point.label} {metric?.totalWeightKg.toFixed(1)} kg
                      </text>
                    </g>
                  );
                })}
              {viewMode === "weight" &&
                screen.supportPlates.map((plate) => {
                  const firstModel = screenCabinets
                    .map((cabinet) => modelById.get(cabinet.modelId))
                    .find((model) => model !== undefined);
                  const pitch = firstModel?.pitchMm ?? 1;
                  const x = plate.xMm / pitch;
                  const y = plate.yMm / pitch;
                  const aliscaf = plate.type === "aliscaf";
                  return (
                    <g key={plate.id} pointerEvents="none">
                      {aliscaf && (
                        <line x1={x - 46} y1={y} x2={x + 46} y2={y} stroke="#276d9c" strokeWidth="8" />
                      )}
                      <rect
                        x={x - 17}
                        y={y - 11}
                        width="34"
                        height="22"
                        rx="4"
                        fill={aliscaf ? "#4aa3d8" : "#d95c78"}
                        stroke="#ffffff"
                        strokeWidth="3"
                      />
                      <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">
                        {aliscaf ? "PA" : "PS"}
                      </text>
                    </g>
                  );
                })}
            </g>
          );
        })}
        {traceActive && traceDragging && activeTraceEnd && tracePointer && (
          <line
            x1={activeTraceEnd.x}
            y1={activeTraceEnd.y}
            x2={tracePointer.x}
            y2={tracePointer.y}
            stroke="#ff861c"
            strokeWidth="5"
            strokeDasharray="12 8"
            markerEnd={viewMode === "data" ? "url(#arrow-data-active)" : "url(#arrow-power-active)"}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}

function cabinetLabels(
  viewMode: ViewMode,
  cabinet: CabinetInstance,
  size: { width: number; height: number },
  data?: { port: number; order: number },
  power?: { line: number; order: number },
): string[] {
  if (viewMode === "pixelmap") {
    return cabinet.excludeFromPixelmap
      ? [`${cabinet.row},${cabinet.column}`, "ESCLUSO PX"]
      : [`${cabinet.row},${cabinet.column}`];
  }
  if (viewMode === "data") {
    return data
      ? [`C-1`, `P-${data.port}`, `RV-${data.order + 1}`, `A-${cabinet.rotation}deg`, `WH-${size.width}x${size.height}`]
      : [`${cabinet.row},${cabinet.column}`, "NON CABLATO"];
  }
  if (viewMode === "power") {
    return power
      ? [`L-${power.line}`, `ORD-${power.order + 1}`, `${cabinet.row},${cabinet.column}`]
      : [`${cabinet.row},${cabinet.column}`, "NO POWER"];
  }
  return [
    `${cabinet.row},${cabinet.column}`,
    `${size.width}x${size.height}px`,
    ...(cabinet.excludeFromPixelmap ? ["NO PIXELMAP"] : []),
  ];
}

function ConnectionRun({
  ids,
  cabinetById,
  modelById,
  screenId,
  color,
  marker,
  startLabel,
}: {
  ids: string[];
  cabinetById: Map<string, CabinetInstance>;
  modelById: Map<string, AppLibraries["cabinets"][number]>;
  screenId: string;
  color: string;
  marker: string;
  startLabel: string;
}) {
  const points = ids
    .map((id) => {
      const cabinet = cabinetById.get(id);
      const model = cabinet ? modelById.get(cabinet.modelId) : undefined;
      if (!cabinet || !model || cabinet.screenId !== screenId) return undefined;
      return cabinetPixelCenter(cabinet, model);
    })
    .filter((point): point is { x: number; y: number } => point !== undefined);
  if (!points.length) return null;
  return (
    <g pointerEvents="none">
      {points.slice(1).map((point, index) => (
        <line
          key={`${point.x}-${point.y}-${index}`}
          x1={points[index].x}
          y1={points[index].y}
          x2={point.x}
          y2={point.y}
          stroke={color}
          strokeWidth="5"
          markerEnd={marker}
        />
      ))}
      <circle cx={points[0].x} cy={points[0].y} r="14" fill="#42f05f" stroke={color} strokeWidth="3" />
      <text x={points[0].x} y={points[0].y + 5} textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>
        {startLabel}
      </text>
      <circle cx={points.at(-1)!.x} cy={points.at(-1)!.y} r="12" fill="#ff2348" stroke={color} strokeWidth="3" />
    </g>
  );
}
