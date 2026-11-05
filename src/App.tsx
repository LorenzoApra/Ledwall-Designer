import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message } from "@tauri-apps/plugin-dialog";
import { BulkGridModal, type BulkGridValues } from "./components/BulkGridModal";
import { CanvasEditor } from "./components/CanvasEditor";
import { Inspector, type InspectorPanel } from "./components/Inspector";
import { DEFAULT_PIXELMAP_OPTIONS, createDefaultProject } from "./data/defaultProject";
import { calculateControllerCapacity } from "./domain/capacity";
import {
  appendCabinetToPowerLine,
  createAutomaticPowerLines,
  removeCabinetFromPowerLines,
  undoLastCabinetFromPowerLine,
} from "./domain/electrical";
import { cabinetPhysicalSize, cabinetPixelSize, calculateScreenPixelBounds } from "./domain/geometry";
import { createId } from "./domain/id";
import { arrangeScreens, createCabinetGrid, findAvailableScreenPosition, replaceScreenCabinets } from "./domain/layout";
import type {
  LedwallProject,
  PortRun,
  SupportPlateType,
  ViewMode,
} from "./domain/types";
import {
  appendCabinetToPortRun,
  createAutoWiring,
  mergeAutomaticPortRuns,
  portColor,
  removeCabinetFromPortRuns,
  undoLastCabinetFromPortRun,
} from "./domain/wiring";
import { createAutomaticSuspensionPoints } from "./domain/weight";
import { createAutomaticSupportPlates } from "./domain/supportPlates";
import { prepareBatchExport, type BatchExportKind } from "./export/batch";
import { exportScreenList } from "./export/selection";
import {
  openProjectFile,
  isTauriRuntime,
  saveBinary,
  saveProjectFile,
} from "./platform/files";
import { useHistoryProject } from "./state/useHistoryProject";
import { useLibraries } from "./state/useLibraries";
import { numberLocale, observeTranslations, readLanguage, saveLanguage, type AppLanguage } from "./i18n";
import { addProjectCanvas, canvasProject, moveScreenToCanvas, projectCanvases, removeProjectCanvas, updateCanvasProject } from "./domain/canvases";

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
  const projectHistory = useHistoryProject(createDefaultProject());
  const fullProject = projectHistory.project;
  const canvases = projectCanvases(fullProject);
  const [selectedCanvasId, setSelectedCanvasId] = useState(canvases[0].id);
  const activeCanvas = canvases.find((canvas) => canvas.id === selectedCanvasId) ?? canvases[0];
  const project = useMemo(() => canvasProject(fullProject, activeCanvas.id), [fullProject, activeCanvas.id]);
  const history = {
    ...projectHistory,
    project,
    commit: (update: (current: LedwallProject) => LedwallProject) =>
      projectHistory.commit((current) => updateCanvasProject(current, activeCanvas.id, update)),
  };
  const { libraries, setLibraries, resetLibraries } = useLibraries();
  const [panel, setPanel] = useState<InspectorPanel>("design");
  const [selectedScreenId, setSelectedScreenId] = useState<string | undefined>(history.project.screens[0]?.id);
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>();
  const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([]);
  const [manualTracePort, setManualTracePort] = useState<number>();
  const [manualPowerLine, setManualPowerLine] = useState<number>();
  const [zoom, setZoom] = useState(0.25);
  const [snap, setSnap] = useState(true);
  const [isolatedScreen, setIsolatedScreen] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filePath, setFilePath] = useState<string>();
  const [savedProject, setSavedProject] = useState(fullProject);
  const [status, setStatus] = useState("Pronto");
  const [busy, setBusy] = useState(false);
  const [exportSelection, setExportSelection] = useState<string[] | undefined>();
  const exportScreens = useMemo(() => exportScreenList(fullProject, libraries), [fullProject, libraries]);
  const exportScreenIds = exportScreens.filter((screen) => screen.cabinetCount > 0 &&
    (exportSelection === undefined || exportSelection.includes(screen.id))).map((screen) => screen.id);
  const [language, setLanguage] = useState<AppLanguage>(readLanguage);
  const appShell = useRef<HTMLDivElement>(null);
  const closeDialogOpen = useRef(false);
  const hasUnsavedChanges = fullProject !== savedProject;
  const viewMode: ViewMode =
    panel === "data" ? "data" : panel === "power" ? "power" : panel === "weight" ? "weight" : panel === "pixelmap" ? "pixelmap" : "design";
  const selectedScreen = project.screens.find((screen) => screen.id === selectedScreenId) ?? project.screens[0];

  useEffect(() => {
    document.documentElement.lang = language;
    saveLanguage(language);
    return appShell.current ? observeTranslations(appShell.current, language) : undefined;
  }, [language, activeCanvas.id]);

  const projectStats = useMemo(() => {
    const totalPixels = project.cabinets.reduce((sum, cabinet) => {
      const model = libraries.cabinets.find((item) => item.id === cabinet.modelId);
      return sum + (model ? model.pixelWidth * model.pixelHeight : 0);
    }, 0);
    const activePixels = project.cabinets.reduce((sum, cabinet) => {
      if (cabinet.excludeFromPixelmap) return sum;
      const model = libraries.cabinets.find((item) => item.id === cabinet.modelId);
      return sum + (model ? model.pixelWidth * model.pixelHeight : 0);
    }, 0);
    return { totalPixels, activePixels, cabinetCount: project.cabinets.length };
  }, [project.cabinets, libraries.cabinets]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      const editing = Boolean((event.target as HTMLElement | null)?.closest(
        "input, textarea, select, [contenteditable='true']",
      ));
      if (command && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave(false);
      } else if (command && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        history.redo();
      } else if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        history.undo();
      } else if (command && event.key.toLowerCase() === "a" && !editing) {
        event.preventDefault();
        selectAllCabinets();
      } else if ((event.key === "Enter" || event.key === "Escape") && !editing && manualTracePort !== undefined) {
        event.preventDefault();
        finishManualTrace();
      } else if ((event.key === "Enter" || event.key === "Escape") && !editing && manualPowerLine !== undefined) {
        event.preventDefault();
        finishManualPowerTrace();
      } else if (event.key.toLowerCase() === "n" && !command && !editing && selectedCabinetIds.length > 0 && panel === "data") {
        event.preventDefault();
        startNewDataPort();
      } else if (event.key.toLowerCase() === "n" && !command && !editing && selectedCabinetIds.length > 0 && panel === "power") {
        event.preventDefault();
        startNewPowerLine();
      } else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedCabinetIds.length > 0 &&
        !editing
      ) {
        event.preventDefault();
        deleteCabinet();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!isTauriRuntime()) {
      if (!hasUnsavedChanges) return;
      const onBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", onBeforeUnload);
      return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow().onCloseRequested(async (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      if (closeDialogOpen.current) return;
      closeDialogOpen.current = true;
      try {
        const choice = await message(
          language === "en"
            ? "The project has unsaved changes. Save before quitting?"
            : "Il progetto contiene modifiche non salvate. Vuoi salvarle prima di uscire?",
          {
            title: language === "en" ? "Save project?" : "Salvare il progetto?",
            kind: "warning",
            buttons: {
              yes: language === "en" ? "Save" : "Salva",
              no: language === "en" ? "Don't save" : "Non salvare",
              cancel: language === "en" ? "Cancel" : "Annulla",
            },
          },
        );
        if (choice === (language === "en" ? "Save" : "Salva")) {
          const saved = await handleSave(false);
          if (saved) await getCurrentWindow().destroy();
        } else if (choice === (language === "en" ? "Don't save" : "Non salvare")) {
          await getCurrentWindow().destroy();
        }
      } finally {
        closeDialogOpen.current = false;
      }
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [hasUnsavedChanges, fullProject, filePath, language]);

  async function handleSave(saveAs: boolean): Promise<boolean> {
    try {
      setBusy(true);
      const result = await saveProjectFile(fullProject, saveAs ? undefined : filePath);
      if (result) {
        setFilePath(result.path);
        setSavedProject(fullProject);
        setStatus(`Salvato: ${result.path.split("/").at(-1)}`);
        return true;
      }
      return false;
    } catch (error) {
      setStatus(errorMessage(error));
      return false;
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
      setExportSelection(undefined);
      setFilePath(result.path);
      setSavedProject(result.project);
      const firstCanvas = projectCanvases(result.project)[0];
      setSelectedCanvasId(firstCanvas.id);
      setSelectedScreenId(canvasProject(result.project, firstCanvas.id).screens[0]?.id);
      setSelectedCabinetId(undefined);
      setSelectedCabinetIds([]);
      setManualTracePort(undefined);
      setManualPowerLine(undefined);
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
    setExportSelection(undefined);
    setSavedProject(next);
    setSelectedCanvasId(projectCanvases(next)[0].id);
    setSelectedScreenId(next.screens[0]?.id);
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
    setFilePath(undefined);
    setStatus("Nuovo progetto creato");
  }

  function selectCanvas(id: string): void {
    if (id === activeCanvas.id || !canvases.some((canvas) => canvas.id === id)) return;
    setSelectedCanvasId(id);
    setSelectedScreenId(canvasProject(fullProject, id).screens[0]?.id);
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
    setBulkOpen(false);
  }

  function addCanvas(): void {
    let number = canvases.length + 1;
    while (canvases.some((canvas) => canvas.name === `CANVAS ${number}`)) number += 1;
    const next = addProjectCanvas(fullProject, `CANVAS ${number}`, language === "en" ? "SCREEN 1" : "SCHERMO 1", activeCanvas.id);
    const created = projectCanvases(next).at(-1)!;
    projectHistory.commit(() => next);
    setSelectedCanvasId(created.id);
    setSelectedScreenId(canvasProject(next, created.id).screens[0]?.id);
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
    setBulkOpen(false);
    setStatus(`Canvas creato: ${created.name}`);
  }

  function renameCanvas(name: string): void {
    projectHistory.commit((current) => ({ ...current, canvases: projectCanvases(current).map((canvas) =>
      canvas.id === activeCanvas.id ? { ...canvas, name } : canvas,
    ) }));
  }

  function changeScreenCanvas(screenId: string, canvasId: string): void {
    const result = moveScreenToCanvas(fullProject, screenId, canvasId, libraries);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    if (result.project === fullProject) return;
    projectHistory.commit(() => result.project);
    setSelectedCanvasId(canvasId);
    setSelectedScreenId(screenId);
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
    setStatus(`Schermo spostato nel canvas: ${canvases.find((canvas) => canvas.id === canvasId)?.name}`);
  }

  async function deleteCanvas(): Promise<void> {
    if (canvases.length <= 1) return;
    const prompt = language === "en"
      ? `Delete ${activeCanvas.name} and its ${project.cabinets.length} cabinets, screens and wiring?`
      : `Eliminare ${activeCanvas.name} con i suoi ${project.cabinets.length} cabinet, schermi e cablaggi?`;
    const deleteLabel = language === "en" ? "Delete" : "Elimina";
    const confirmed = isTauriRuntime()
      ? await message(prompt, { title: language === "en" ? "Delete canvas" : "Elimina canvas", kind: "warning",
        buttons: { ok: deleteLabel, cancel: language === "en" ? "Cancel" : "Annulla" } }) === deleteLabel
      : window.confirm(prompt);
    if (!confirmed) return;
    const remaining = canvases.find((canvas) => canvas.id !== activeCanvas.id)!;
    projectHistory.commit((current) => removeProjectCanvas(current, activeCanvas.id));
    selectCanvas(remaining.id);
    setStatus(`Canvas eliminato: ${activeCanvas.name}`);
  }

  function addScreen(): void {
    const id = createId("screen");
    const position = findAvailableScreenPosition(project, libraries.cabinets, id);
    history.commit((current) => ({
      ...current,
      screens: [
        ...current.screens,
        {
          id,
          name: `${language === "en" ? "SCREEN" : "SCHERMO"} ${current.screens.length + 1}`,
          canvasX: position.canvasX,
          canvasY: position.canvasY,
          cabinetIds: [],
          pixelmap: { ...DEFAULT_PIXELMAP_OPTIONS },
          suspensionPoints: [],
          supportPlates: [],
          flybars: [],
          dataPattern: "columns-tl",
          powerPattern: "rows-tl",
        },
      ],
    }));
    setSelectedScreenId(id);
    setIsolatedScreen(true);
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
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
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
  }

  function createBulk(values: BulkGridValues): void {
    if (!selectedScreen) return;
    const model = libraries.cabinets.find((item) => item.id === values.modelId);
    if (!model) return;
    const grid = createCabinetGrid(selectedScreen, model, values);
    const isNewScreen = !project.cabinets.some((cabinet) => cabinet.screenId === selectedScreen.id);
    const position = isNewScreen ? findAvailableScreenPosition(project, libraries.cabinets, selectedScreen.id,
      calculateScreenPixelBounds(selectedScreen, grid, libraries.cabinets)) : undefined;
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
            ? { ...screen, ...(position ? { canvasX: position.canvasX, canvasY: position.canvasY } : {}), cabinetIds: nextIds, suspensionPoints: [], supportPlates: [], flybars: [] }
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
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
    setStatus(position && !position.fits ? "Schermo fuori dal canvas master: riposizionalo o amplia il canvas." : `Creata matrice ${values.columns}×${values.rows} (${grid.length} cabinet)`);
  }

  function selectScreen(id?: string): void {
    if (!id || id === selectedScreenId) return;
    setSelectedScreenId(id);
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setManualTracePort(undefined);
    setManualPowerLine(undefined);
  }

  function moveScreen(id: string, canvasX: number, canvasY: number): void {
    history.commit((current) => ({ ...current, screens: current.screens.map((screen) =>
      screen.id === id ? { ...screen, canvasX, canvasY } : screen,
    ) }));
  }

  function arrangeAllScreens(): void {
    history.commit((current) => arrangeScreens(current, libraries.cabinets));
    setIsolatedScreen(false);
    setStatus("Schermi affiancati nel canvas master.");
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

  function selectCabinet(id?: string, additive = false, wholeRow = false): void {
    if (!id) {
      setSelectedCabinetId(undefined);
      setSelectedCabinetIds([]);
      return;
    }
    const cabinet = project.cabinets.find((item) => item.id === id);
    if (cabinet) setSelectedScreenId(cabinet.screenId);
    if (cabinet && wholeRow) {
      const ids = project.cabinets
        .filter((item) => item.screenId === cabinet.screenId && item.row === cabinet.row)
        .sort((a, b) => a.column - b.column)
        .map((item) => item.id);
      setSelectedCabinetIds(ids);
      setSelectedCabinetId(id);
      setStatus(`Riga ${cabinet.row}: ${ids.length} cabinet selezionati`);
      return;
    }
    if (!additive) {
      setSelectedCabinetId(id);
      setSelectedCabinetIds([id]);
      return;
    }
    setSelectedCabinetIds((current) => {
      const contains = current.includes(id);
      const next = contains
        ? current.filter((item) => item !== id)
        : [...current, id];
      setSelectedCabinetId(contains ? next.at(-1) : id);
      return next;
    });
  }

  function selectAllCabinetsInScreen(): void {
    if (!selectedScreen) return;
    const ids = project.cabinets
      .filter((cabinet) => cabinet.screenId === selectedScreen.id)
      .sort((a, b) => a.row - b.row || a.column - b.column)
      .map((cabinet) => cabinet.id);
    setSelectedCabinetIds(ids);
    setSelectedCabinetId(ids.at(-1));
    setStatus(`${ids.length} cabinet selezionati in ${selectedScreen.name}`);
  }

  function selectAllCabinets(): void {
    if (isolatedScreen) {
      selectAllCabinetsInScreen();
      return;
    }
    const ids = [...project.cabinets]
      .sort((a, b) => a.screenId.localeCompare(b.screenId) || a.row - b.row || a.column - b.column)
      .map((cabinet) => cabinet.id);
    setSelectedCabinetIds(ids);
    setSelectedCabinetId(ids.at(-1));
    if (ids.length) {
      const last = project.cabinets.find((cabinet) => cabinet.id === ids.at(-1));
      if (last) setSelectedScreenId(last.screenId);
    }
    setStatus(`${ids.length} cabinet selezionati nel canvas`);
  }

  function setPixelmapExclusion(excluded: boolean): void {
    const ids = new Set(selectedCabinetIds);
    if (!ids.size) return;
    history.commit((current) => ({
      ...current,
      cabinets: current.cabinets.map((cabinet) =>
        ids.has(cabinet.id)
          ? { ...cabinet, excludeFromPixelmap: excluded }
          : cabinet,
      ),
    }));
    setStatus(
      `${ids.size} cabinet ${excluded ? "esclusi dalla" : "riammessi nella"} pixelmap`,
    );
  }

  function deleteCabinet(): void {
    const ids = new Set(
      selectedCabinetIds.length
        ? selectedCabinetIds
        : selectedCabinetId
          ? [selectedCabinetId]
          : [],
    );
    if (!ids.size) return;
    const deletedCabinets = project.cabinets.filter((cabinet) => ids.has(cabinet.id));
    history.commit((current) => ({
      ...current,
      cabinets: current.cabinets.filter((cabinet) => !ids.has(cabinet.id)),
      screens: current.screens.map((screen) => ({
        ...screen,
        cabinetIds: screen.cabinetIds.filter((id) => !ids.has(id)),
        suspensionPoints: screen.suspensionPoints
          .map((point) => ({
            ...point,
            cabinetIds: point.cabinetIds.filter((id) => !ids.has(id)),
          }))
          .filter((point) => point.cabinetIds.length > 0),
        supportPlates: screen.supportPlates.filter(
          (plate) => !plate.cabinetIds.some((id) => ids.has(id)),
        ),
        flybars: screen.flybars
          .map((flybar) => ({ ...flybar, cabinetIds: flybar.cabinetIds.filter((id) => !ids.has(id)) }))
          .filter((flybar) => flybar.cabinetIds.length > 0),
      })),
      controllers: current.controllers.map((controller) => ({
        ...controller,
        portRuns: controller.portRuns
          .map((run) => ({ ...run, cabinetIds: run.cabinetIds.filter((id) => !ids.has(id)) }))
          .filter((run) => run.cabinetIds.length > 0),
      })),
      powerLines: current.powerLines
        .map((line) => ({ ...line, cabinetIds: line.cabinetIds.filter((id) => !ids.has(id)) }))
        .filter((line) => line.cabinetIds.length > 0),
    }));
    setSelectedCabinetId(undefined);
    setSelectedCabinetIds([]);
    setStatus(
      `${deletedCabinets.length} cabinet eliminati · usa Annulla per ripristinarli`,
    );
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
    selectCabinet(id);
  }

  function autoWire(allScreens = false): void {
    const controller = project.controllers[0];
    const controllerModel = libraries.controllers.find((model) => model.id === controller?.modelId);
    if (!controller || !controllerModel) return;
    const runs: PortRun[] = [];
    const warnings: string[] = [];
    const targetScreens = allScreens ? project.screens : selectedScreen ? [selectedScreen] : [];
    for (const screen of targetScreens) {
      const result = createAutoWiring(screen, project.cabinets, controller, libraries);
      warnings.push(...result.warnings.filter((warning) => !warning.startsWith("Percorso scelto")));
      if (!result.runs.length && project.cabinets.some((cabinet) => cabinet.screenId === screen.id && !cabinet.excludeFromPixelmap)) {
        setStatus(result.warnings.at(-1) ?? "Cablaggio non generato.");
        return;
      }
      runs.push(...result.runs);
    }
    const targetIds = new Set(project.cabinets.filter((cabinet) => targetScreens.some((screen) => screen.id === cabinet.screenId)).map((cabinet) => cabinet.id));
    const merged = mergeAutomaticPortRuns(controller.portRuns, targetIds, runs, controllerModel.ethernetPorts,
      controller.mode.redundancy, `${language === "en" ? "Second" : "Secondo"} ${controllerModel.name}`);
    if (merged.error) {
      setStatus(merged.error);
      return;
    }
    const configuredRuns = merged.runs;
    const totalPixels = projectStats.activePixels;
    const capacity = calculateControllerCapacity(controllerModel, controller);
    if (totalPixels > capacity.totalCapacityPixels) warnings.push(`Pixel totali ${formatInt(totalPixels)} oltre il limite ${formatInt(capacity.totalCapacityPixels)}.`);
    if (runs.length > controllerModel.ethernetPorts) warnings.push(`Richieste ${runs.length} porte, disponibili ${controllerModel.ethernetPorts}.`);
    if (controller.mode.redundancy && configuredRuns.some((run) => run.backupPortNumber === undefined)) warnings.push("Porte insufficienti per un backup interno completo; usare il secondo controller.");
    history.commit((current) => ({ ...current, controllers: current.controllers.map((item, index) => index === 0 ? { ...item, portRuns: configuredRuns } : item) }));
    setManualTracePort(undefined);
    setStatus(warnings.length ? warnings.at(-1)! : `Cablaggio creato su ${configuredRuns.length} porte`);
  }

  function assignSelectedCabinet(portNumber?: number): void {
    const selectedIds = selectedCabinetIds.length
      ? selectedCabinetIds
      : selectedCabinetId
        ? [selectedCabinetId]
        : [];
    if (!selectedIds.length) return;
    history.commit((current) => {
      const controller = current.controllers[0];
      let runs = controller.portRuns;
      selectedIds.forEach((cabinetId) => {
        runs = portNumber === undefined
          ? removeCabinetFromPortRuns(runs, cabinetId)
          : appendCabinetToPortRun(runs, portNumber, cabinetId);
      });
      return { ...current, controllers: [{ ...controller, portRuns: runs }, ...current.controllers.slice(1)] };
    });
    setManualTracePort(portNumber);
    setStatus(
      portNumber === undefined
        ? `${selectedIds.length} cabinet rimossi dalla porta dati`
        : `${selectedIds.length} cabinet assegnati a P-${portNumber}; traccia attiva`,
    );
  }

  function startNewDataPort(): void {
    const controller = project.controllers[0];
    const model = libraries.controllers.find((item) => item.id === controller?.modelId);
    if (!controller || !model || selectedCabinetIds.length === 0) return;
    const usedPorts = new Set(controller.portRuns.map((run) => run.portNumber));
    const nextPort = Array.from(
      { length: model.ethernetPorts },
      (_, index) => index + 1,
    ).find((port) => !usedPorts.has(port));
    if (nextPort === undefined) {
      setStatus(`Nessuna porta libera su ${model.name}`);
      return;
    }
    assignSelectedCabinet(nextPort);
  }

  function traceCabinet(cabinetId: string): void {
    if (manualTracePort === undefined) return;
    const activeRun = project.controllers[0]?.portRuns.find(
      (run) => run.portNumber === manualTracePort,
    );
    const cabinet = project.cabinets.find((item) => item.id === cabinetId);
    if (!cabinet) return;
    selectCabinet(cabinetId);
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
      selectCabinet(lastCabinet.id);
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
    selectCabinet(preview.nextCabinetId);
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

  function autoPower(allScreens = false): void {
    const targetScreens = allScreens ? project.screens : selectedScreen ? [selectedScreen] : [];
    const targetIds = new Set(project.cabinets.filter((cabinet) => targetScreens.some((screen) => screen.id === cabinet.screenId)).map((cabinet) => cabinet.id));
    const retained = project.powerLines.map((line) => ({ ...line, cabinetIds: line.cabinetIds.filter((id) => !targetIds.has(id)) }))
      .filter((line) => line.cabinetIds.length > 0);
    const lines = createAutomaticPowerLines(project.cabinets.filter((cabinet) => targetIds.has(cabinet.id)), libraries, project.electrical, targetScreens);
    const used = new Set(retained.map((line) => line.lineNumber));
    let nextNumber = 1;
    const generated = lines.map((line) => {
      while (used.has(nextNumber)) nextNumber += 1;
      const number = nextNumber++;
      used.add(number);
      return { ...line, lineNumber: number, color: portColor(number - 1) };
    });
    history.commit((current) => ({ ...current, powerLines: [...retained, ...generated].sort((a, b) => a.lineNumber - b.lineNumber) }));
    setManualPowerLine(undefined);
    setStatus(`Distribuzione elettrica: ${lines.length} linee`);
  }

  function assignSelectedCabinetToPowerLine(lineNumber?: number): void {
    const selectedIds = selectedCabinetIds.length
      ? selectedCabinetIds
      : selectedCabinetId
        ? [selectedCabinetId]
        : [];
    if (!selectedIds.length) return;
    history.commit((current) => {
      let powerLines = current.powerLines;
      selectedIds.forEach((cabinetId) => {
        powerLines = lineNumber === undefined
          ? removeCabinetFromPowerLines(powerLines, cabinetId)
          : appendCabinetToPowerLine(powerLines, lineNumber, cabinetId);
      });
      return { ...current, powerLines };
    });
    setManualPowerLine(lineNumber);
    setStatus(
      lineNumber === undefined
        ? `${selectedIds.length} cabinet rimossi dalla linea elettrica`
        : `${selectedIds.length} cabinet assegnati a L-${lineNumber}; traccia attiva`,
    );
  }

  function startNewPowerLine(): void {
    if (selectedCabinetIds.length === 0) return;
    const usedLines = new Set(project.powerLines.map((line) => line.lineNumber));
    let nextLine = 1;
    while (usedLines.has(nextLine)) nextLine += 1;
    assignSelectedCabinetToPowerLine(nextLine);
  }

  function tracePowerCabinet(cabinetId: string): void {
    if (manualPowerLine === undefined) return;
    const activeLine = project.powerLines.find(
      (line) => line.lineNumber === manualPowerLine,
    );
    const cabinet = project.cabinets.find((item) => item.id === cabinetId);
    if (!cabinet) return;
    selectCabinet(cabinetId);
    setSelectedScreenId(cabinet.screenId);
    if (activeLine?.cabinetIds.includes(cabinetId)) return;

    history.commit((current) => ({
      ...current,
      powerLines: appendCabinetToPowerLine(
        current.powerLines,
        manualPowerLine,
        cabinetId,
      ),
    }));
    setStatus(`Cabinet aggiunto alla linea elettrica L-${manualPowerLine}`);
  }

  function activateManualPowerTrace(lineNumber: number): void {
    const line = project.powerLines.find((item) => item.lineNumber === lineNumber);
    const lastCabinetId = line?.cabinetIds.at(-1);
    const lastCabinet = project.cabinets.find((item) => item.id === lastCabinetId);
    setManualPowerLine(lineNumber);
    if (lastCabinet) {
      selectCabinet(lastCabinet.id);
      setSelectedScreenId(lastCabinet.screenId);
    }
    setStatus(`Traccia elettrica L-${lineNumber} attiva`);
  }

  function finishManualPowerTrace(): void {
    setManualPowerLine(undefined);
    setStatus("Disegno linea elettrica terminato");
  }

  function undoManualPowerTraceStep(): void {
    if (manualPowerLine === undefined) return;
    const preview = undoLastCabinetFromPowerLine(
      project.powerLines,
      manualPowerLine,
    );
    history.commit((current) => ({
      ...current,
      powerLines: undoLastCabinetFromPowerLine(
        current.powerLines,
        manualPowerLine,
      ).lines,
    }));
    selectCabinet(preview.nextCabinetId);
    setStatus(
      preview.removedCabinetId
        ? `Ultimo cabinet rimosso dalla linea L-${manualPowerLine}`
        : `La linea L-${manualPowerLine} non contiene cabinet`,
    );
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

  function autoSupportPlates(type: SupportPlateType): void {
    if (!selectedScreen) return;
    const plan = createAutomaticSupportPlates(
      selectedScreen,
      project.cabinets,
      libraries,
      type,
      project.rigging.plateRequirementHeightMm,
    );
    const manualPlates = selectedScreen.supportPlates.filter((plate) => !plate.automatic);
    const generatedPlates = plan.plates.filter((candidate) =>
      !manualPlates.some((manual) =>
        Math.abs(manual.xMm - candidate.xMm) <= 2 &&
        Math.abs(manual.yMm - candidate.yMm) <= 2,
      ),
    );
    history.commit((current) => ({
      ...current,
      screens: current.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? {
              ...screen,
              supportPlates: [
                ...screen.supportPlates.filter((plate) => !plate.automatic),
                ...generatedPlates,
              ],
            }
          : screen,
      ),
    }));
    const preserved = plan.plates.length - generatedPlates.length;
    setStatus(
      `${generatedPlates.length} piastre automatiche generate` +
      (preserved ? `; ${preserved} giunti già coperti da piastre manuali` : ""),
    );
  }

  function addManualSupportPlate(type: SupportPlateType): void {
    if (!selectedScreen) return;
    const selected = project.cabinets.filter(
      (cabinet) =>
        cabinet.screenId === selectedScreen.id &&
        selectedCabinetIds.includes(cabinet.id),
    );
    const fallback = project.cabinets.find(
      (cabinet) => cabinet.screenId === selectedScreen.id,
    );
    const reference = selected.length ? selected : fallback ? [fallback] : [];
    if (!reference.length) return;
    const centers = reference.map((cabinet) => {
      const model = libraries.cabinets.find((item) => item.id === cabinet.modelId);
      if (!model) return { x: cabinet.physicalXmm, y: cabinet.physicalYmm };
      const size = cabinetPhysicalSize(cabinet, model);
      if (reference.length === 1) {
        return {
          x: cabinet.physicalXmm + size.width,
          y: cabinet.physicalYmm + size.height,
        };
      }
      return {
        x: cabinet.physicalXmm + size.width / 2,
        y: cabinet.physicalYmm + size.height / 2,
      };
    });
    const xMm = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
    const yMm = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;
    const plate = {
      id: createId("support-plate"),
      type,
      xMm,
      yMm,
      cabinetIds: reference.map((cabinet) => cabinet.id),
      automatic: false,
    } as const;
    history.commit((current) => ({
      ...current,
      screens: current.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? { ...screen, supportPlates: [...screen.supportPlates, plate] }
          : screen,
      ),
    }));
    setStatus(`Piastra ${type === "aliscaf" ? "con aliscaf" : "semplice"} aggiunta`);
  }

  function moveSupportPlate(screenId: string, id: string, xMm: number, yMm: number): void {
    history.commit((current) => ({
      ...current,
      screens: current.screens.map((screen) => screen.id === screenId
        ? {
            ...screen,
            supportPlates: screen.supportPlates.map((plate) => plate.id === id
              ? { ...plate, xMm, yMm, automatic: false }
              : plate),
          }
        : screen),
    }));
  }

  function moveFlybar(screenId: string, id: string, xMm: number, yMm: number): void {
    history.commit((current) => ({
      ...current,
      screens: current.screens.map((screen) => screen.id === screenId
        ? {
            ...screen,
            flybars: screen.flybars.map((flybar) => flybar.id === id
              ? { ...flybar, xMm, yMm }
              : flybar),
          }
        : screen),
    }));
  }

  async function exportBatch(kind: BatchExportKind): Promise<void> {
    try {
      setBusy(true);
      setStatus(language === "en" ? "Preparing export…" : "Preparazione export…");
      const result = await prepareBatchExport(fullProject, libraries, exportScreenIds, kind, language,
        (completed, total) => setStatus(`${language === "en" ? "Preparing export" : "Preparazione export"}: ${completed}/${total}`));
      const path = await saveBinary(result.bytes, result.name, language === "en" ? "Export selected screens" : "Esporta schermi selezionati", [result.extension], result.mimeType);
      if (path) setStatus(`${language === "en" ? "Exported screens" : "Schermi esportati"}: ${result.screenCount} — ${path.split("/").at(-1)}${result.skippedScreens ? ` (${result.skippedScreens} ${language === "en" ? "without active pixels, skipped" : "senza pixel attivi, esclusi"})` : ""}`);
      else setStatus(language === "en" ? "Export cancelled." : "Export annullato.");
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" key={`${language}-${activeCanvas.id}`} ref={appShell}>
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
        <label className="language-menu">
          <span>{language === "it" ? "Lingua" : "Language"}</span>
          <select aria-label={language === "it" ? "Lingua" : "Language"} value={language} onChange={(event) => {
            const next = event.target.value as AppLanguage;
            saveLanguage(next);
            setLanguage(next);
          }}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="history-actions">
          <button className="icon-button" disabled={!history.canUndo} onClick={history.undo} title={language === "en" ? "Undo" : "Annulla"}>↶</button>
          <button className="icon-button" disabled={!history.canRedo} onClick={history.redo} title={language === "en" ? "Redo" : "Ripristina"}>↷</button>
        </div>
      </header>

      <nav className="sidebar">
        {PANELS.map((item) => (
          <button key={item.id} className={panel === item.id ? "active" : ""} onClick={() => {
            setPanel(item.id);
            if (item.id !== "data") setManualTracePort(undefined);
            if (item.id !== "power") setManualPowerLine(undefined);
          }}>
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>

      <main className="workspace">
        <div className="canvas-tabs" role="tablist" aria-label="Canvas del progetto">
          {canvases.map((canvas) => <button key={canvas.id} role="tab" aria-selected={canvas.id === activeCanvas.id}
            className={canvas.id === activeCanvas.id ? "active" : ""} onClick={() => selectCanvas(canvas.id)}>
            <span data-user-text>{canvas.name || "Canvas"}</span><small>{canvas.width}×{canvas.height}</small>
          </button>)}
          <button className="add-canvas" onClick={addCanvas}>+ Canvas</button>
        </div>
        <div className="canvas-toolbar">
          <div className="toolbar-group"><span className="toolbar-label">Vista</span><strong>{panelLabel(panel)}</strong></div>
          <div className="toolbar-group screen-view-controls">
            <select aria-label="Vista schermi" value={isolatedScreen ? "selected" : "master"} onChange={(event) => {
              setIsolatedScreen(event.target.value === "selected");
              setSelectedCabinetId(undefined);
              setSelectedCabinetIds([]);
            }}>
              <option value="selected">Solo schermo selezionato</option>
              <option value="master">Canvas master · tutti</option>
            </select>
            <select aria-label="Schermo selezionato" value={selectedScreen?.id ?? ""} onChange={(event) => selectScreen(event.target.value)}>
              {project.screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
            </select>
          </div>
          <div className="toolbar-group"><button className={`tool-toggle ${snap ? "active" : ""}`} onClick={() => setSnap(!snap)}>Snap</button></div>
          <div className="toolbar-group">
            <button
              className="tool-toggle danger"
              disabled={!selectedCabinetIds.length}
              onClick={deleteCabinet}
              title="Elimina il cabinet selezionato (Canc/Backspace)"
            >
              Elimina {selectedCabinetIds.length || ""} cabinet
            </button>
          </div>
          {panel === "data" && (
            <div className="toolbar-group">
              <button className="tool-toggle" disabled={!selectedCabinetIds.length} onClick={startNewDataPort} title="Scorciatoia: N">+ Nuova porta</button>
              {manualTracePort !== undefined && <button className="tool-toggle active" onClick={finishManualTrace} title="Scorciatoia: Invio o Esc">Termina P-{manualTracePort}</button>}
            </div>
          )}
          {panel === "power" && (
            <div className="toolbar-group">
              <button className="tool-toggle" disabled={!selectedCabinetIds.length} onClick={startNewPowerLine} title="Scorciatoia: N">+ Nuova linea</button>
              {manualPowerLine !== undefined && <button className="tool-toggle active" onClick={finishManualPowerTrace} title="Scorciatoia: Invio o Esc">Termina L-{manualPowerLine}</button>}
            </div>
          )}
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
          isolatedScreen={isolatedScreen}
          selectedCabinetId={selectedCabinetId}
          selectedCabinetIds={selectedCabinetIds}
          manualTracePort={manualTracePort}
          manualPowerLine={manualPowerLine}
          snap={snap}
          onSelectScreen={selectScreen}
          onMoveScreen={moveScreen}
          onSelectCabinet={selectCabinet}
          onMoveCabinet={moveCabinet}
          onMoveSupportPlate={moveSupportPlate}
          onMoveFlybar={moveFlybar}
          onZoomChange={setZoom}
          onTraceCabinet={traceCabinet}
          onTracePowerCabinet={tracePowerCabinet}
          onFinishTrace={manualTracePort !== undefined ? finishManualTrace : finishManualPowerTrace}
        />
        <div className="statusbar"><span className={busy ? "status-dot busy" : "status-dot"} /><span>{busy ? "Elaborazione…" : status}</span><span className="status-spacer" /><span>Offline</span><span>Front View</span></div>
      </main>

      <Inspector
        panel={panel}
        project={project}
        libraries={libraries}
        canvases={canvases}
        selectedCanvasId={activeCanvas.id}
        onSelectCanvas={selectCanvas}
        onAddCanvas={addCanvas}
        onRenameCanvas={renameCanvas}
        onDeleteCanvas={() => void deleteCanvas()}
        onMoveScreenToCanvas={changeScreenCanvas}
        selectedScreenId={selectedScreenId}
        selectedCabinetId={selectedCabinetId}
        selectedCabinetIds={selectedCabinetIds}
        manualTracePort={manualTracePort}
        manualPowerLine={manualPowerLine}
        onProjectChange={history.commit}
        onLibrariesChange={setLibraries}
        onResetLibraries={resetLibraries}
        onSelectScreen={selectScreen}
        onSelectCabinet={(id) => selectCabinet(id)}
        onSelectAllCabinetsInScreen={selectAllCabinetsInScreen}
        onClearCabinetSelection={() => selectCabinet(undefined)}
        onSetPixelmapExclusion={setPixelmapExclusion}
        onAddScreen={addScreen}
        onDeleteScreen={deleteScreen}
        onDeleteCabinet={deleteCabinet}
        onDuplicateCabinet={duplicateCabinet}
        onShowBulk={() => setBulkOpen(true)}
        onAutoWire={autoWire}
        onAutoPower={autoPower}
        onArrangeScreens={arrangeAllScreens}
        onAssignSelectedCabinetToPowerLine={assignSelectedCabinetToPowerLine}
        onActivateManualPowerTrace={activateManualPowerTrace}
        onFinishManualPowerTrace={finishManualPowerTrace}
        onUndoManualPowerTraceStep={undoManualPowerTraceStep}
        onAutoSuspension={autoSuspension}
        onAutoSupportPlates={autoSupportPlates}
        onAddManualSupportPlate={addManualSupportPlate}
        onAssignSelectedCabinet={assignSelectedCabinet}
        onActivateManualTrace={activateManualTrace}
        onFinishManualTrace={finishManualTrace}
        onUndoManualTraceStep={undoManualTraceStep}
        onMoveCabinetInRun={moveCabinetInRun}
        exportScreens={exportScreens}
        exportScreenIds={exportScreenIds}
        onExportSelection={setExportSelection}
        onBatchExport={(kind) => void exportBatch(kind)}
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
  return new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 0 }).format(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
