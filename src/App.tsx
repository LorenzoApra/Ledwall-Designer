import { useEffect, useMemo, useState } from "react";
import { BulkGridModal, type BulkGridValues } from "./components/BulkGridModal";
import { CanvasEditor } from "./components/CanvasEditor";
import { Inspector, type InspectorPanel } from "./components/Inspector";
import { DEFAULT_PIXELMAP_OPTIONS, createDefaultProject } from "./data/defaultProject";
import { calculateControllerCapacity } from "./domain/capacity";
import { createAutomaticPowerLines } from "./domain/electrical";
import { cabinetPixelSize } from "./domain/geometry";
import { createId } from "./domain/id";
import { createCabinetGrid, replaceScreenCabinets } from "./domain/layout";
import type { LedwallProject, PortRun, ViewMode } from "./domain/types";
import {
  appendCabinetToPortRun,
  createAutoWiring,
  portColor,
  removeCabinetFromPortRuns,
  undoLastCabinetFromPortRun,
} from "./domain/wiring";
import { createAutomaticSuspensionPoints } from "./domain/weight";
import { renderMasterPixelmap, renderScreenPixelmap } from "./export/pixelmap";
import {
  canvasToPngBytes,
  openProjectFile,
  sanitizeFilename,
  saveBinary,
  saveProjectFile,
} from "./platform/files";
import { useHistoryProject } from "./state/useHistoryProject";
import { useLibraries } from "./state/useLibraries";

const PANELS: { id: InspectorPanel; label: string; icon: string }[] = [
  { id: "project", label: "Progetto", icon: "PR" },
  { id: "design", label: "Disegno", icon: "DW" },
  { id: "data", label: "Dati", icon: "DT" },
  { id: "power", label: "Elettrico", icon: "EL" },
  { id: "weight", label: "Peso", icon: "KG" },
  { id: "pixelmap", label: "Pixelmap", icon: "PX" },
  { id: "library", label: "Librerie", icon: "LB" },
  { id: "output", label: "Output", icon: "EX" },
];

export default function App() {
  const history = useHistoryProject(createDefaultProject());
  const { libraries, setLibraries, resetLibraries } = useLibraries();
  const [panel, setPanel] = useState<InspectorPanel>("design");
  const [selectedScreenId, setSelectedScreenId] = useState<string | undefined>(history.project.screens[0]?.id);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>();
  const [manualTracePort, setManualTracePort] = useState<number>();
  const [zoom, setZoom] = useState(0.25);
  const [snap, setSnap] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filePath, setFilePath] = useState<string>();
  const [status, setStatus] = useState("Pronto");
  const [busy, setBusy] = useState(false);
  const project = history.project;
  const viewMode: ViewMode =
    panel === "data" ? "data" : panel === "power" ? "power" : panel === "weight" ? "weight" : panel === "pixelmap" ? "pixelmap" : "design";
  const selectedScreen = project.screens.find((screen) => screen.id === selectedScreenId) ?? project.screens[0];

  const projectStats = useMemo(() => {
    const totalPixels = project.cabinets.reduce((sum, cabinet) => {
      const model = libraries.cabinets.find((item) => item.id === cabinet.modelId);
      return sum + (model ? model.pixelWidth * model.pixelHeight : 0);
    }, 0);
    return { totalPixels, cabinetCount: project.cabinets.length };
  }, [project.cabinets, libraries.cabinets]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave(false);
      } else if (command && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        history.redo();
      } else if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        history.undo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function handleSave(saveAs: boolean): Promise<void> {
    try {
      setBusy(true);
      const result = await saveProjectFile(project, saveAs ? undefined : filePath);
      if (result) {
        setFilePath(result.path);
        setStatus(`Salvato: ${result.path.split("/").at(-1)}`);
      }
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(): Promise<void> {
    try {
      setBusy(true);
      const result = await openProjectFile();
      if (!result) return;
      history.replace(result.project);
      setFilePath(result.path);
      setSelectedScreenId(result.project.screens[0]?.id);
      setSelectedCabinetId(undefined);
      setManualTracePort(undefined);
      setStatus(`Aperto: ${result.project.metadata.projectName}`);
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleNew(): void {
    const next = createDefaultProject();
    history.replace(next);
    setSelectedScreenId(next.screens[0]?.id);
    setSelectedCabinetId(undefined);
    setManualTracePort(undefined);
    setFilePath(undefined);
    setStatus("Nuovo progetto creato");
  }

  function addScreen(): void {
    const id = createId("screen");
    history.commit((current) => ({
      ...current,
      screens: [
        ...current.screens,
        {
          id,
          name: `SCHERMO ${current.screens.length + 1}`,
          canvasX: 0,
          canvasY: 0,
          cabinetIds: [],
          pixelmap: { ...DEFAULT_PIXELMAP_OPTIONS },
          suspensionPoints: [],
        },
      ],
    }));
    setSelectedScreenId(id);
    setSelectedCabinetId(undefined);
  }

  function deleteScreen(): void {
    if (!selectedScreen || project.screens.length <= 1) return;
    const removedIds = new Set(project.cabinets.filter((cabinet) => cabinet.screenId === selectedScreen.id).map((cabinet) => cabinet.id));
    history.commit((current) => ({
      ...current,
      screens: current.screens.filter((screen) => screen.id !== selectedScreen.id),
      cabinets: current.cabinets.filter((cabinet) => !removedIds.has(cabinet.id)),
      controllers: current.controllers.map((controller) => ({
        ...controller,
        portRuns: controller.portRuns
          .map((run) => ({ ...run, cabinetIds: run.cabinetIds.filter((id) => !removedIds.has(id)) }))
          .filter((run) => run.cabinetIds.length > 0),
      })),
      powerLines: current.powerLines
        .map((line) => ({ ...line, cabinetIds: line.cabinetIds.filter((id) => !removedIds.has(id)) }))
        .filter((line) => line.cabinetIds.length > 0),
    }));
    const remaining = project.screens.find((screen) => screen.id !== selectedScreen.id);
    setSelectedScreenId(remaining?.id);
    setSelectedCabinetId(undefined);
    setManualTracePort(undefined);
  }

  function createBulk(values: BulkGridValues): void {
    if (!selectedScreen) return;
    const model = libraries.cabinets.find((item) => item.id === values.modelId);
    if (!model) return;
    const grid = createCabinetGrid(selectedScreen, model, values);
    history.commit((current) => {
      const oldIds = new Set(
        values.replaceExisting
          ? current.cabinets.filter((cabinet) => cabinet.screenId === selectedScreen.id).map((cabinet) => cabinet.id)
          : [],
      );
      const cabinets = values.replaceExisting
        ? replaceScreenCabinets(current.cabinets, selectedScreen.id, grid)
        : [...current.cabinets, ...grid];
      const nextIds = cabinets.filter((cabinet) => cabinet.screenId === selectedScreen.id).map((cabinet) => cabinet.id);
      return {
        ...current,
        cabinets,
        screens: current.screens.map((screen) =>
          screen.id === selectedScreen.id
            ? { ...screen, cabinetIds: nextIds, suspensionPoints: [] }
            : screen,
        ),
        controllers: current.controllers.map((controller) => ({
          ...controller,
          portRuns: controller.portRuns
            .map((run) => ({ ...run, cabinetIds: run.cabinetIds.filter((id) => !oldIds.has(id)) }))
            .filter((run) => run.cabinetIds.length > 0),
        })),
        powerLines: current.powerLines
          .map((line) => ({ ...line, cabinetIds: line.cabinetIds.filter((id) => !oldIds.has(id)) }))
          .filter((line) => line.cabinetIds.length > 0),
      };
    });
    setBulkOpen(false);
    setManualTracePort(undefined);
    setStatus(`Creata matrice ${values.columns}×${values.rows} (${grid.length} cabinet)`);
  }

  function moveCabinet(id: string, pixelX: number, pixelY: number): void {
    history.commit((current) => ({
      ...current,
      cabinets: current.cabinets.map((cabinet) => {
        if (cabinet.id !== id) return cabinet;
        const model = libraries.cabinets.find((item) => item.id === cabinet.modelId);
        return {
          ...cabinet,
          pixelX,
          pixelY,
          physicalXmm: model ? pixelX * model.pitchMm : cabinet.physicalXmm,
          physicalYmm: model ? pixelY * model.pitchMm : cabinet.physicalYmm,
        };
      }),
    }));
  }

  function deleteCabinet(): void {
    if (!selectedCabinetId) return;
    history.commit((current) => ({
      ...current,
      cabinets: current.cabinets.filter((cabinet) => cabinet.id !== selectedCabinetId),
      screens: current.screens.map((screen) => ({
        ...screen,
        cabinetIds: screen.cabinetIds.filter((id) => id !== selectedCabinetId),
        suspensionPoints: screen.suspensionPoints.map((point) => ({
          ...point,
          cabinetIds: point.cabinetIds.filter((id) => id !== selectedCabinetId),
        })),
      })),
      controllers: current.controllers.map((controller) => ({
        ...controller,
        portRuns: controller.portRuns
          .map((run) => ({ ...run, cabinetIds: run.cabinetIds.filter((id) => id !== selectedCabinetId) }))
          .filter((run) => run.cabinetIds.length > 0),
      })),
      powerLines: current.powerLines
        .map((line) => ({ ...line, cabinetIds: line.cabinetIds.filter((id) => id !== selectedCabinetId) }))
        .filter((line) => line.cabinetIds.length > 0),
    }));
    setSelectedCabinetId(undefined);
  }

  function duplicateCabinet(): void {
    const source = project.cabinets.find((cabinet) => cabinet.id === selectedCabinetId);
    const model = source ? libraries.cabinets.find((item) => item.id === source.modelId) : undefined;
    if (!source || !model) return;
    const size = cabinetPixelSize(source, model);
    const id = createId("cabinet");
    const copy = {
      ...source,
      id,
      column: source.column + 1,
      pixelX: source.pixelX + size.width,
      physicalXmm: source.physicalXmm + model.widthMm,
    };
    history.commit((current) => ({
      ...current,
      cabinets: [...current.cabinets, copy],
      screens: current.screens.map((screen) =>
        screen.id === source.screenId ? { ...screen, cabinetIds: [...screen.cabinetIds, id] } : screen,
      ),
    }));
    setSelectedCabinetId(id);
  }

  function autoWire(): void {
    const controller = project.controllers[0];
    const controllerModel = libraries.controllers.find((model) => model.id === controller?.modelId);
    if (!controller || !controllerModel) return;
    let nextPort = 1;
    const runs: PortRun[] = [];
    const warnings: string[] = [];
    for (const screen of project.screens) {
      const result = createAutoWiring(screen, project.cabinets, controller, libraries);
      warnings.push(...result.warnings.filter((warning) => !warning.startsWith("Percorso scelto")));
      result.runs.forEach((run) => {
        runs.push({ ...run, portNumber: nextPort, color: portColor(nextPort - 1) });
        nextPort += 1;
      });
    }
    const used = new Set(runs.map((run) => run.portNumber));
    const backupPorts = Array.from({ length: controllerModel.ethernetPorts }, (_, index) => controllerModel.ethernetPorts - index).filter((port) => !used.has(port));
    runs.forEach((run, index) => {
      run.backupPortNumber = controller.mode.redundancy ? backupPorts[index] : undefined;
      run.backupControllerName = controller.mode.redundancy ? `Secondo ${controllerModel.name}: porta ${run.portNumber}` : undefined;
    });
    const totalPixels = projectStats.totalPixels;
    const capacity = calculateControllerCapacity(controllerModel, controller);
    if (totalPixels > capacity.totalCapacityPixels) warnings.push(`Pixel totali ${formatInt(totalPixels)} oltre il limite ${formatInt(capacity.totalCapacityPixels)}.`);
    if (runs.length > controllerModel.ethernetPorts) warnings.push(`Richieste ${runs.length} porte, disponibili ${controllerModel.ethernetPorts}.`);
    if (controller.mode.redundancy && backupPorts.length < runs.length) warnings.push("Porte insufficienti per un backup interno completo; usare il secondo controller.");
    history.commit((current) => ({ ...current, controllers: current.controllers.map((item, index) => index === 0 ? { ...item, portRuns: runs } : item) }));
    setManualTracePort(undefined);
    setStatus(warnings.length ? warnings.at(-1)! : `Cablaggio creato su ${runs.length} porte`);
  }

  function assignSelectedCabinet(portNumber?: number): void {
    if (!selectedCabinetId) return;
    history.commit((current) => {
      const controller = current.controllers[0];
      const runs = portNumber === undefined
        ? removeCabinetFromPortRuns(controller.portRuns, selectedCabinetId)
        : appendCabinetToPortRun(controller.portRuns, portNumber, selectedCabinetId);
      return { ...current, controllers: [{ ...controller, portRuns: runs }, ...current.controllers.slice(1)] };
    });
    setManualTracePort(portNumber);
    setStatus(
      portNumber === undefined
        ? "Cabinet rimosso dalla porta dati"
        : `Traccia P-${portNumber} attiva: trascina dal cabinet selezionato sugli altri`,
    );
  }

  function traceCabinet(cabinetId: string): void {
    if (manualTracePort === undefined) return;
    const activeRun = project.controllers[0]?.portRuns.find(
      (run) => run.portNumber === manualTracePort,
    );
    const cabinet = project.cabinets.find((item) => item.id === cabinetId);
    if (!cabinet) return;
    setSelectedCabinetId(cabinetId);
    setSelectedScreenId(cabinet.screenId);
    if (activeRun?.cabinetIds.includes(cabinetId)) return;

    history.commit((current) => {
      const controller = current.controllers[0];
      const runs = appendCabinetToPortRun(
        controller.portRuns,
        manualTracePort,
        cabinetId,
      );
      return {
        ...current,
        controllers: [{ ...controller, portRuns: runs }, ...current.controllers.slice(1)],
      };
    });
    setStatus(`Cabinet aggiunto alla traccia P-${manualTracePort}`);
  }

  function activateManualTrace(portNumber: number): void {
    const run = project.controllers[0]?.portRuns.find(
      (item) => item.portNumber === portNumber,
    );
    const lastCabinetId = run?.cabinetIds.at(-1);
    const lastCabinet = project.cabinets.find((item) => item.id === lastCabinetId);
    setManualTracePort(portNumber);
    if (lastCabinet) {
      setSelectedCabinetId(lastCabinet.id);
      setSelectedScreenId(lastCabinet.screenId);
    }
    setStatus(`Traccia P-${portNumber} attiva: trascina per continuare il percorso`);
  }

  function finishManualTrace(): void {
    setManualTracePort(undefined);
    setStatus("Cablaggio manuale terminato");
  }

  function undoManualTraceStep(): void {
    if (manualTracePort === undefined) return;
    const controller = project.controllers[0];
    if (!controller) return;
    const preview = undoLastCabinetFromPortRun(controller.portRuns, manualTracePort);
    history.commit((current) => {
      const currentController = current.controllers[0];
      const result = undoLastCabinetFromPortRun(
        currentController.portRuns,
        manualTracePort,
      );
      return {
        ...current,
        controllers: [
          { ...currentController, portRuns: result.runs },
          ...current.controllers.slice(1),
        ],
      };
    });
    setSelectedCabinetId(preview.nextCabinetId);
    setStatus(
      preview.removedCabinetId
        ? `Ultimo cabinet rimosso dalla traccia P-${manualTracePort}`
        : `La porta P-${manualTracePort} non contiene cabinet`,
    );
  }

  function moveCabinetInRun(direction: -1 | 1): void {
    if (!selectedCabinetId) return;
    history.commit((current) => ({
      ...current,
      controllers: current.controllers.map((controller, controllerIndex) =>
        controllerIndex !== 0
          ? controller
          : {
              ...controller,
              portRuns: controller.portRuns.map((run) => {
                const index = run.cabinetIds.indexOf(selectedCabinetId);
                const target = index + direction;
                if (index < 0 || target < 0 || target >= run.cabinetIds.length) return run;
                const ids = [...run.cabinetIds];
                [ids[index], ids[target]] = [ids[target], ids[index]];
                return { ...run, cabinetIds: ids };
              }),
            },
      ),
    }));
  }

  function autoPower(): void {
    const lines = createAutomaticPowerLines(project.cabinets, libraries, project.electrical);
    history.commit((current) => ({ ...current, powerLines: lines }));
    setStatus(`Distribuzione elettrica: ${lines.length} linee`);
  }

  function autoSuspension(): void {
    history.commit((current) => ({
      ...current,
      screens: current.screens.map((screen) => ({
        ...screen,
        suspensionPoints: createAutomaticSuspensionPoints(screen, current.cabinets, libraries),
      })),
    }));
    setStatus("Punti di sospensione rigenerati per colonna");
  }

  async function exportPng(kind: "master" | "screen"): Promise<void> {
    try {
      setBusy(true);
      if (kind === "screen" && !selectedScreen) throw new Error("Seleziona uno schermo.");
      const rendered = kind === "master"
        ? await renderMasterPixelmap(project, libraries)
        : await renderScreenPixelmap(project, libraries, selectedScreen!);
      const bytes = await canvasToPngBytes(rendered.canvas);
      const name = `${sanitizeFilename(rendered.label)}.png`;
      const path = await saveBinary(bytes, name, "Esporta pixelmap PNG", ["png"], "image/png");
      if (path) setStatus(`Pixelmap esportata: ${path.split("/").at(-1)}`);
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function exportPdf(kind: "technical" | "wiring"): Promise<void> {
    try {
      setBusy(true);
      const { createTechnicalPdf, createWiringPdf } = await import("./export/reports");
      const bytes = kind === "technical" ? createTechnicalPdf(project, libraries) : createWiringPdf(project, libraries);
      const suffix = kind === "technical" ? "Relazione tecnica" : "Cablaggi";
      const name = `${sanitizeFilename(project.metadata.projectName)} - ${suffix}.pdf`;
      const path = await saveBinary(bytes, name, `Esporta ${suffix}`, ["pdf"], "application/pdf");
      if (path) setStatus(`PDF esportato: ${path.split("/").at(-1)}`);
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>LEDWALL</strong><small>DESIGNER</small></div>
        </div>
        <div className="file-actions">
          <button onClick={handleNew}>Nuovo</button>
          <button onClick={() => void handleOpen()}>Apri</button>
          <button onClick={() => void handleSave(false)}>Salva</button>
          <button onClick={() => void handleSave(true)}>Salva con nome</button>
        </div>
        <div className="project-heading">
          <strong>{project.metadata.projectName}</strong>
          <span>{filePath ? filePath.split("/").at(-1) : "Non salvato"}</span>
        </div>
        <div className="history-actions">
          <button className="icon-button" disabled={!history.canUndo} onClick={history.undo} title="Annulla">↶</button>
          <button className="icon-button" disabled={!history.canRedo} onClick={history.redo} title="Ripristina">↷</button>
        </div>
      </header>

      <nav className="sidebar">
        {PANELS.map((item) => (
          <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => {
            setPanel(item.id);
            if (item.id !== "data") setManualTracePort(undefined);
          }}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>

      <main className="workspace">
        <div className="canvas-toolbar">
          <div className="toolbar-group"><span className="toolbar-label">Vista</span><strong>{panelLabel(panel)}</strong></div>
          <div className="toolbar-group"><button className={`tool-toggle ${snap ? "active" : ""}`} onClick={() => setSnap(!snap)}>Snap</button></div>
          <div className="toolbar-group zoom-control"><button onClick={() => setZoom(Math.max(0.08, zoom - 0.05))}>−</button><input type="range" min="8" max="100" value={zoom * 100} onChange={(event) => setZoom(Number(event.target.value) / 100)} /><button onClick={() => setZoom(Math.min(1, zoom + 0.05))}>+</button><span>{Math.round(zoom * 100)}%</span></div>
          <div className="toolbar-spacer" />
          <div className="canvas-stats"><span>{project.canvasWidth}×{project.canvasHeight}</span><span>{projectStats.cabinetCount} cabinet</span><span>{formatInt(projectStats.totalPixels)} px</span></div>
        </div>
        <CanvasEditor
          project={project}
          libraries={libraries}
          viewMode={viewMode}
          zoom={zoom}
          selectedScreenId={selectedScreenId}
          selectedCabinetId={selectedCabinetId}
          manualTracePort={manualTracePort}
          snap={snap}
          onSelectScreen={setSelectedScreenId}
          onSelectCabinet={setSelectedCabinetId}
          onMoveCabinet={moveCabinet}
          onTraceCabinet={traceCabinet}
        />
        <div className="statusbar"><span className={busy ? "status-dot busy" : "status-dot"} /><span>{busy ? "Elaborazione…" : status}</span><span className="status-spacer" /><span>Offline</span><span>Front View</span></div>
      </main>

      <Inspector
        panel={panel}
        project={project}
        libraries={libraries}
        selectedScreenId={selectedScreenId}
        selectedCabinetId={selectedCabinetId}
        manualTracePort={manualTracePort}
        onProjectChange={history.commit}
        onLibrariesChange={setLibraries}
        onResetLibraries={resetLibraries}
        onSelectScreen={setSelectedScreenId}
        onSelectCabinet={setSelectedCabinetId}
        onAddScreen={addScreen}
        onDeleteScreen={deleteScreen}
        onDeleteCabinet={deleteCabinet}
        onDuplicateCabinet={duplicateCabinet}
        onShowBulk={() => setBulkOpen(true)}
        onAutoWire={autoWire}
        onAutoPower={autoPower}
        onAutoSuspension={autoSuspension}
        onAssignSelectedCabinet={assignSelectedCabinet}
        onActivateManualTrace={activateManualTrace}
        onFinishManualTrace={finishManualTrace}
        onUndoManualTraceStep={undoManualTraceStep}
        onMoveCabinetInRun={moveCabinetInRun}
        onExportMasterPng={() => void exportPng("master")}
        onExportScreenPng={() => void exportPng("screen")}
        onExportTechnicalPdf={() => void exportPdf("technical")}
        onExportWiringPdf={() => void exportPdf("wiring")}
        busy={busy}
      />

      {bulkOpen && <BulkGridModal libraries={libraries} onClose={() => setBulkOpen(false)} onCreate={createBulk} />}
    </div>
  );
}

function panelLabel(panel: InspectorPanel): string {
  return PANELS.find((item) => item.id === panel)?.label ?? panel;
}

function formatInt(value: number): string {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
