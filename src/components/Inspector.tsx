import { useMemo, useState } from "react";
import { numberLocale, readLanguage } from "../i18n";
import { calculateControllerCapacity, calculatePortMetrics } from "../domain/capacity";
import { calculatePowerLineMetrics } from "../domain/electrical";
import { cabinetPhysicalSize, cabinetPixelSize, calculateScreenPixelBounds } from "../domain/geometry";
import { createId } from "../domain/id";
import { createAutomaticSupportPlates } from "../domain/supportPlates";
import { parseLibraryCsv } from "../domain/libraryCsv";
import { parseRcfgFile } from "../domain/rcfg";
import { calculateProjectTotals } from "../domain/projectMetrics";
import { calculateFlybarMetrics } from "../domain/flybars";
import { calculateEstimatedProjectWeightKg, calculateSuspensionMetrics } from "../domain/weight";
import { assignAutomaticBackupPorts } from "../domain/wiring";
import type {
  AppLibraries,
  AccessoryModel,
  BitDepth,
  CabinetInstance,
  CabinetModel,
  ControllerModel,
  FlybarMode,
  FlybarModel,
  LedwallProject,
  PortRun,
  Rotation,
  SupportPlateType,
} from "../domain/types";
import { DecimalInput, Field, Metric, Section, Toggle } from "./Ui";

export type InspectorPanel = "project" | "design" | "data" | "power" | "weight" | "pixelmap" | "library" | "output";

interface InspectorProps {
  panel: InspectorPanel;
  project: LedwallProject;
  libraries: AppLibraries;
  selectedScreenId?: string;
  selectedCabinetId?: string;
  selectedCabinetIds: string[];
  manualTracePort?: number;
  manualPowerLine?: number;
  onProjectChange: (update: (project: LedwallProject) => LedwallProject) => void;
  onLibrariesChange: (libraries: AppLibraries) => void;
  onResetLibraries: () => void;
  onSelectScreen: (id?: string) => void;
  onSelectCabinet: (id?: string) => void;
  onSelectAllCabinetsInScreen: () => void;
  onClearCabinetSelection: () => void;
  onSetPixelmapExclusion: (excluded: boolean) => void;
  onAddScreen: () => void;
  onDeleteScreen: () => void;
  onDeleteCabinet: () => void;
  onDuplicateCabinet: () => void;
  onShowBulk: () => void;
  onAutoWire: () => void;
  onAutoPower: () => void;
  onAssignSelectedCabinetToPowerLine: (lineNumber?: number) => void;
  onActivateManualPowerTrace: (lineNumber: number) => void;
  onFinishManualPowerTrace: () => void;
  onUndoManualPowerTraceStep: () => void;
  onAutoSuspension: () => void;
  onAutoSupportPlates: (type: SupportPlateType) => void;
  onAddManualSupportPlate: (type: SupportPlateType) => void;
  onAssignSelectedCabinet: (portNumber?: number) => void;
  onActivateManualTrace: (portNumber: number) => void;
  onFinishManualTrace: () => void;
  onUndoManualTraceStep: () => void;
  onMoveCabinetInRun: (direction: -1 | 1) => void;
  onExportMasterPng: () => void;
  onExportScreenPng: () => void;
  onExportTechnicalPdf: () => void;
  onExportWiringPdf: () => void;
  busy?: boolean;
}

export function Inspector(props: InspectorProps) {
  return (
    <aside className="inspector">
      <div className="inspector-title">
        <span className="eyebrow">{panelEyebrow(props.panel)}</span>
        <h2>{panelTitle(props.panel)}</h2>
      </div>
      <div className="inspector-content">
        {props.panel === "project" && <ProjectPanel {...props} />}
        {props.panel === "design" && <DesignPanel {...props} />}
        {props.panel === "data" && <DataPanel {...props} />}
        {props.panel === "power" && <PowerPanel {...props} />}
        {props.panel === "weight" && <WeightPanel {...props} />}
        {props.panel === "pixelmap" && <PixelmapPanel {...props} />}
        {props.panel === "library" && <LibraryPanel {...props} />}
        {props.panel === "output" && <OutputPanel {...props} />}
      </div>
    </aside>
  );
}

function ProjectPanel({ project, onProjectChange }: InspectorProps) {
  const updateMetadata = (key: keyof LedwallProject["metadata"], value: string) =>
    onProjectChange((current) => ({
      ...current,
      metadata: { ...current.metadata, [key]: value },
    }));
  return (
    <>
      <Section title="Identificazione">
        <Field label="Nome progetto / Evento">
          <input
            value={project.metadata.projectName || project.metadata.event}
            onChange={(event) => onProjectChange((current) => ({
              ...current,
              metadata: {
                ...current.metadata,
                projectName: event.target.value,
                event: event.target.value,
              },
            }))}
          />
        </Field>
        <Field label="Azienda"><input value={project.metadata.company} onChange={(event) => updateMetadata("company", event.target.value)} /></Field>
        <Field label="Cliente"><input value={project.metadata.client} onChange={(event) => updateMetadata("client", event.target.value)} /></Field>
        <Field label="Location"><input value={project.metadata.location} onChange={(event) => updateMetadata("location", event.target.value)} /></Field>
        <div className="two-columns">
          <Field label="Autore"><input value={project.metadata.author} onChange={(event) => updateMetadata("author", event.target.value)} /></Field>
          <Field label="Revisione"><input value={project.metadata.revision} onChange={(event) => updateMetadata("revision", event.target.value)} /></Field>
        </div>
        <Field label="Data"><input type="date" value={project.metadata.date} onChange={(event) => updateMetadata("date", event.target.value)} /></Field>
        <Field label="Logo report/pixelmap" hint="PNG o JPEG, memorizzato nel progetto">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => updateMetadata("logoDataUrl", String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
        </Field>
      </Section>
      <Section title="Canvas video">
        <div className="preset-row">
          <button className="chip" onClick={() => onProjectChange((current) => ({ ...current, canvasWidth: 3840, canvasHeight: 2160 }))}>4K UHD</button>
          <button className="chip" onClick={() => onProjectChange((current) => ({ ...current, canvasWidth: 7680, canvasHeight: 4320 }))}>8K UHD</button>
        </div>
        <div className="two-columns">
          <Field label="Larghezza px"><input type="number" min="1" value={project.canvasWidth} onChange={(event) => onProjectChange((current) => ({ ...current, canvasWidth: Number(event.target.value) }))} /></Field>
          <Field label="Altezza px"><input type="number" min="1" value={project.canvasHeight} onChange={(event) => onProjectChange((current) => ({ ...current, canvasHeight: Number(event.target.value) }))} /></Field>
        </div>
      </Section>
    </>
  );
}

function DesignPanel(props: InspectorProps) {
  const { project, libraries, selectedScreenId, selectedCabinetId, onProjectChange } = props;
  const screen = project.screens.find((item) => item.id === selectedScreenId) ?? project.screens[0];
  const cabinet = project.cabinets.find((item) => item.id === selectedCabinetId);
  const selectedCabinets = project.cabinets.filter((item) =>
    props.selectedCabinetIds.includes(item.id),
  );
  const allExcludedFromPixelmap =
    selectedCabinets.length > 0 &&
    selectedCabinets.every((item) => item.excludeFromPixelmap);
  const model = cabinet ? libraries.cabinets.find((item) => item.id === cabinet.modelId) : undefined;
  const bounds = screen ? calculateScreenPixelBounds(screen, project.cabinets, libraries.cabinets) : undefined;

  const updateScreen = (patch: Partial<typeof screen>) => {
    if (!screen) return;
    onProjectChange((current) => ({
      ...current,
      screens: current.screens.map((item) => (item.id === screen.id ? { ...item, ...patch } : item)),
    }));
  };
  const updateCabinet = (patch: Partial<CabinetInstance>) => {
    if (!cabinet) return;
    onProjectChange((current) => ({
      ...current,
      cabinets: current.cabinets.map((item) => (item.id === cabinet.id ? { ...item, ...patch } : item)),
    }));
  };

  return (
    <>
      <Section title="Schermi" action={<button className="mini-button" onClick={props.onAddScreen}>+ Schermo</button>}>
        <div className="screen-list">
          {project.screens.map((item) => (
            <button key={item.id} className={`screen-list-item ${item.id === screen?.id ? "selected" : ""}`} onClick={() => props.onSelectScreen(item.id)}>
              <span>{item.name}</span>
              <small>{item.cabinetIds.length} cabinet</small>
            </button>
          ))}
        </div>
        {screen && (
          <>
            <Field label="Nome schermo"><input value={screen.name} onChange={(event) => updateScreen({ name: event.target.value })} /></Field>
            <div className="two-columns">
              <Field label="Canvas X"><input type="number" value={screen.canvasX} onChange={(event) => updateScreen({ canvasX: Number(event.target.value) })} /></Field>
              <Field label="Canvas Y"><input type="number" value={screen.canvasY} onChange={(event) => updateScreen({ canvasY: Number(event.target.value) })} /></Field>
            </div>
            {bounds && <div className="info-strip">{Math.round(bounds.width)} × {Math.round(bounds.height)} px</div>}
            <div className="button-row">
              <button className="button primary grow" onClick={props.onShowBulk}>Crea bulk</button>
              <button className="button danger" onClick={props.onDeleteScreen} disabled={project.screens.length === 1}>Elimina</button>
            </div>
          </>
        )}
      </Section>

      <Section title={`Selezione (${selectedCabinets.length})`}>
        <p className="empty-copy">
          Clic normale: singolo · Cmd/Ctrl + clic: aggiungi/rimuovi · Shift + clic: intera riga · Cmd/Ctrl+A: tutto il canvas.
        </p>
        <div className="button-row">
          <button className="button secondary grow" onClick={props.onSelectAllCabinetsInScreen}>Tutto lo schermo</button>
          <button className="button secondary grow" disabled={!selectedCabinets.length} onClick={props.onClearCabinetSelection}>Deseleziona</button>
        </div>
        <Toggle
          label="Escludi dalla pixelmap"
          checked={allExcludedFromPixelmap}
          disabled={!selectedCabinets.length}
          onChange={props.onSetPixelmapExclusion}
        />
        <button className="button danger full" disabled={!selectedCabinets.length} onClick={props.onDeleteCabinet}>
          Elimina {selectedCabinets.length || ""} cabinet
        </button>
      </Section>

      <Section title="Cabinet selezionato">
        {!cabinet || !model ? (
          <p className="empty-copy">Seleziona un cabinet nel canvas per modificarlo.</p>
        ) : (
          <>
            <Field label="Modello">
              <select value={cabinet.modelId} onChange={(event) => updateCabinet({ modelId: event.target.value })}>
                {libraries.cabinets.map((item) => <option key={item.id} value={item.id}>{item.manufacturer} {item.name}</option>)}
              </select>
            </Field>
            <div className="two-columns">
              <Field label="Riga"><input type="number" min="1" value={cabinet.row} onChange={(event) => updateCabinet({ row: Number(event.target.value) })} /></Field>
              <Field label="Colonna"><input type="number" min="1" value={cabinet.column} onChange={(event) => updateCabinet({ column: Number(event.target.value) })} /></Field>
            </div>
            <div className="two-columns">
              <Field label="Pixel X"><input type="number" min="0" value={cabinet.pixelX} onChange={(event) => updateCabinet({ pixelX: Number(event.target.value) })} /></Field>
              <Field label="Pixel Y"><input type="number" min="0" value={cabinet.pixelY} onChange={(event) => updateCabinet({ pixelY: Number(event.target.value) })} /></Field>
            </div>
            <Field label="Rotazione">
              <select value={cabinet.rotation} onChange={(event) => updateCabinet({ rotation: Number(event.target.value) as Rotation })}>
                {[0, 90, 180, 270].map((value) => <option key={value} value={value}>{value}°</option>)}
              </select>
            </Field>
            <div className="info-grid">
              <Metric label="Pixel" value={`${cabinetPixelSize(cabinet, model).width}×${cabinetPixelSize(cabinet, model).height}`} />
              <Metric label="Fisico" value={`${cabinetPhysicalSize(cabinet, model).width}×${cabinetPhysicalSize(cabinet, model).height} mm`} />
            </div>
            <div className="button-row">
              <button className="button secondary grow" onClick={props.onDuplicateCabinet}>Duplica</button>
              <button className="button danger" onClick={props.onDeleteCabinet}>Elimina selezione</button>
            </div>
          </>
        )}
      </Section>
    </>
  );
}

function DataPanel(props: InspectorProps) {
  const { project, libraries, onProjectChange } = props;
  const controller = project.controllers[0];
  const model = libraries.controllers.find((item) => item.id === controller?.modelId);
  const capacity = model && controller ? calculateControllerCapacity(model, controller) : undefined;
  const portMetrics = controller ? calculatePortMetrics(project, libraries, controller) : [];
  const selectedAssignment = controller?.portRuns.find((run) => run.cabinetIds.includes(props.selectedCabinetId ?? ""));
  const selectedCabinet = project.cabinets.find((cabinet) => cabinet.id === props.selectedCabinetId);
  const selectedCabinets = project.cabinets.filter((cabinet) =>
    props.selectedCabinetIds.includes(cabinet.id),
  );
  const selectedPortNumbers = new Set(
    selectedCabinets
      .map((cabinet) =>
        controller?.portRuns.find((run) => run.cabinetIds.includes(cabinet.id))
          ?.portNumber,
      )
      .filter((value): value is number => value !== undefined),
  );
  const commonPortNumber =
    selectedCabinets.length > 0 &&
    selectedPortNumbers.size === 1 &&
    selectedCabinets.every((cabinet) =>
      controller?.portRuns.some((run) => run.cabinetIds.includes(cabinet.id)),
    )
      ? [...selectedPortNumbers][0]
      : undefined;
  const activeTraceRun = controller?.portRuns.find((run) => run.portNumber === props.manualTracePort);
  const mainPortNumbers = new Set(controller?.portRuns.map((run) => run.portNumber) ?? []);
  const updateController = (patch: Partial<typeof controller>) => {
    if (!controller) return;
    onProjectChange((current) => ({ ...current, controllers: [{ ...controller, ...patch }, ...current.controllers.slice(1)] }));
  };
  const updateMode = (patch: Partial<typeof controller.mode>) => updateController({ mode: { ...controller.mode, ...patch } });
  const updatePortRun = (runId: string, patch: Partial<PortRun>) => {
    onProjectChange((current) => ({
      ...current,
      controllers: current.controllers.map((item, index) =>
        index === 0
          ? {
              ...item,
              mode: { ...item.mode, redundancy: true },
              portRuns: item.portRuns.map((run) => run.id === runId ? { ...run, ...patch } : run),
            }
          : item,
      ),
    }));
  };
  const autoAssignBackups = () => {
    if (!controller || !model) return;
    onProjectChange((current) => ({
      ...current,
      controllers: current.controllers.map((item, index) =>
        index === 0
          ? {
              ...item,
              mode: { ...item.mode, redundancy: true },
              portRuns: assignAutomaticBackupPorts(
                item.portRuns,
                model.ethernetPorts,
                `${readLanguage() === "en" ? "Second" : "Secondo"} ${model.name}`,
              ),
            }
          : item,
      ),
    }));
  };

  return (
    <>
      <Section title="Controller NovaStar">
        <Field label="Modello">
          <select value={controller?.modelId} onChange={(event) => {
            props.onFinishManualTrace();
            updateController({ modelId: event.target.value, portRuns: [] });
          }}>
            {libraries.controllers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Nome istanza"><input value={controller?.name ?? ""} onChange={(event) => updateController({ name: event.target.value })} /></Field>
        <div className="two-columns">
          <Field label="Frame rate">
            <select value={controller?.mode.frameRate} onChange={(event) => updateMode({ frameRate: Number(event.target.value) })}>
              {(model?.capabilities.frameRates ?? [50, 60]).map((rate) => <option key={rate} value={rate}>{rate} Hz</option>)}
            </select>
          </Field>
          <Field label="Bit depth">
            <select value={controller?.mode.bitDepth} onChange={(event) => updateMode({ bitDepth: Number(event.target.value) as BitDepth })}>
              {(model?.capabilities.bitDepths ?? [8]).map((depth) => <option key={depth} value={depth}>{depth} bit</option>)}
            </select>
          </Field>
        </div>
        <Field label="Margine sicurezza %"><input type="number" min="0" max="50" value={controller?.mode.safetyMarginPercent ?? 0} onChange={(event) => updateMode({ safetyMarginPercent: Number(event.target.value) })} /></Field>
        <Toggle label="HDR" checked={controller?.mode.hdr ?? false} disabled={!model?.capabilities.hdr} onChange={(value) => updateMode({ hdr: value })} />
        <Toggle label="3D" checked={controller?.mode.threeD ?? false} disabled={!model?.capabilities.threeD} onChange={(value) => updateMode({ threeD: value })} />
        <Toggle label="Low latency" checked={controller?.mode.lowLatency ?? false} disabled={!model?.capabilities.lowLatency} onChange={(value) => updateMode({ lowLatency: value })} />
        <Toggle label="Ridondanza" checked={controller?.mode.redundancy ?? false} disabled={!model?.capabilities.portBackup && !model?.capabilities.controllerBackup} onChange={(value) => updateMode({ redundancy: value })} />
        {capacity && (
          <div className="info-grid">
            <Metric label="Per porta" value={`${formatInt(capacity.portCapacityPixels)} px`} />
            <Metric label="Totale" value={`${formatInt(capacity.totalCapacityPixels)} px`} />
          </div>
        )}
        <button className="button primary full" onClick={props.onAutoWire}>Calcola cablaggio automatico</button>
        {capacity?.warnings.map((warning) => <p className="warning-copy" key={warning}>{warning}</p>)}
      </Section>

      <Section title="Cablaggio manuale">
        {props.manualTracePort !== undefined && (
          <div className="trace-banner">
            <strong>Traccia P-{props.manualTracePort} attiva</strong>
            <span>Tieni premuto sul cabinet e trascina sugli altri nell’ordine di cablaggio.</span>
          </div>
        )}
        {!props.selectedCabinetId ? (
          <p className="empty-copy">
            Seleziona il primo cabinet sul canvas, poi scegli la porta da cui partire.
          </p>
        ) : (
          <>
            {selectedCabinet && (
              <div className="info-strip">
                {selectedCabinets.length} cabinet selezionati · ultimo: {selectedCabinet.row},{selectedCabinet.column}
                {selectedAssignment
                  ? ` · P-${selectedAssignment.portNumber} · ordine ${selectedAssignment.cabinetIds.indexOf(selectedCabinet.id) + 1}`
                  : " · non cablato"}
              </div>
            )}
            <Field label="Porta di partenza">
              <select value={commonPortNumber ?? ""} onChange={(event) => props.onAssignSelectedCabinet(event.target.value ? Number(event.target.value) : undefined)}>
                <option value="">Non assegnato</option>
                {Array.from({ length: model?.ethernetPorts ?? 0 }, (_, index) => <option key={index + 1} value={index + 1}>Porta {index + 1}</option>)}
              </select>
            </Field>
            <div className="button-row">
              <button className="button secondary grow" disabled={!selectedAssignment || selectedCabinets.length !== 1} onClick={() => props.onMoveCabinetInRun(-1)}>Prima</button>
              <button className="button secondary grow" disabled={!selectedAssignment || selectedCabinets.length !== 1} onClick={() => props.onMoveCabinetInRun(1)}>Dopo</button>
            </div>
            <button
              className="button danger full"
              disabled={selectedPortNumbers.size === 0}
              onClick={() => props.onAssignSelectedCabinet(undefined)}
            >
              Rimuovi cabinet dalla porta
            </button>
          </>
        )}
        {props.manualTracePort !== undefined ? (
          <div className="button-row">
            <button
              className="button secondary grow"
              disabled={!activeTraceRun?.cabinetIds.length}
              onClick={props.onUndoManualTraceStep}
            >
              Annulla ultimo tratto
            </button>
            <button className="button primary grow" onClick={props.onFinishManualTrace}>
              Termina traccia
            </button>
          </div>
        ) : selectedAssignment ? (
          <button
            className="button primary full"
            onClick={() => props.onActivateManualTrace(selectedAssignment.portNumber)}
          >
            Continua traccia P-{selectedAssignment.portNumber}
          </button>
        ) : null}
      </Section>

      <Section title="Porte e backup">
        <button className="button secondary full" disabled={!controller?.portRuns.length} onClick={autoAssignBackups}>
          Assegna backup automatici
        </button>
        <div className="run-list">
          {portMetrics.length === 0 && <p className="empty-copy">Nessuna porta assegnata.</p>}
          {portMetrics.map((metric) => (
            <div className={`run-card ${metric.valid ? "" : "invalid"} ${metric.run.portNumber === props.manualTracePort ? "active-trace" : ""}`} key={metric.run.id}>
              <div className="run-card-title"><i style={{ background: metric.run.color }} /><strong>P-{metric.run.portNumber}</strong><span>{metric.run.cabinetIds.length} cab.</span></div>
              <div className="progress"><span style={{ width: `${Math.min(100, metric.utilizationPercent)}%`, background: metric.run.color }} /></div>
              <small>
                {metric.virtualTailApplied ? "Carico NovaLCT" : "Carico"}: {formatInt(metric.loadingPixels)} / {formatInt(metric.capacityPixels)} px · {metric.utilizationPercent.toFixed(1)}%
              </small>
              {metric.virtualTailApplied && (
                <small className={metric.virtualPixels > 0 ? "virtual-tail-warning" : ""}>
                  {formatInt(metric.pixels)} px reali + {formatInt(metric.virtualPixels)} px virtuali · rettangolo {formatInt(metric.loadingWidthPixels)}×{formatInt(metric.loadingHeightPixels)} px
                </small>
              )}
              <small className="run-order">Ordine: {metric.run.cabinetIds.map((id) => {
                const cabinet = project.cabinets.find((item) => item.id === id);
                return cabinet ? `${cabinet.row},${cabinet.column}` : "?";
              }).join(" → ")}</small>
              <div className="two-columns">
                <Field label="Backup interno">
                  <select
                    value={metric.run.backupPortNumber ?? ""}
                    onChange={(event) => updatePortRun(metric.run.id, {
                      backupPortNumber: event.target.value ? Number(event.target.value) : undefined,
                    })}
                  >
                    <option value="">Nessuno</option>
                    {Array.from({ length: model?.ethernetPorts ?? 0 }, (_, index) => index + 1)
                      .filter((port) =>
                        port !== metric.run.portNumber &&
                        (!mainPortNumbers.has(port) || port === metric.run.backupPortNumber),
                      )
                      .map((port) => <option key={port} value={port}>P-{port}</option>)}
                  </select>
                </Field>
                <Field label="Backup secondo controller">
                  <input
                    value={metric.run.backupControllerName ?? ""}
                    placeholder={`Controller B: ${readLanguage() === "en" ? "port" : "porta"} ${metric.run.portNumber}`}
                    onChange={(event) => updatePortRun(metric.run.id, {
                      backupControllerName: event.target.value || undefined,
                    })}
                  />
                </Field>
              </div>
              <button className="mini-button full" onClick={() => props.onActivateManualTrace(metric.run.portNumber)}>
                Modifica percorso
              </button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function PowerPanel(props: InspectorProps) {
  const { project, onProjectChange, libraries } = props;
  const metrics = calculatePowerLineMetrics(project, libraries);
  const selectedCabinet = project.cabinets.find(
    (cabinet) => cabinet.id === props.selectedCabinetId,
  );
  const selectedCabinets = project.cabinets.filter((cabinet) =>
    props.selectedCabinetIds.includes(cabinet.id),
  );
  const selectedAssignment = project.powerLines.find((line) =>
    line.cabinetIds.includes(props.selectedCabinetId ?? ""),
  );
  const selectedLineNumbers = new Set(
    selectedCabinets
      .map((cabinet) =>
        project.powerLines.find((line) => line.cabinetIds.includes(cabinet.id))
          ?.lineNumber,
      )
      .filter((value): value is number => value !== undefined),
  );
  const commonLineNumber =
    selectedCabinets.length > 0 &&
    selectedLineNumbers.size === 1 &&
    selectedCabinets.every((cabinet) =>
      project.powerLines.some((line) => line.cabinetIds.includes(cabinet.id)),
    )
      ? [...selectedLineNumbers][0]
      : undefined;
  const activeTraceLine = project.powerLines.find(
    (line) => line.lineNumber === props.manualPowerLine,
  );
  const nextLineNumber = Math.max(
    0,
    ...project.powerLines.map((line) => line.lineNumber),
  ) + 1;
  const selectableLineNumbers = [
    ...new Set([
      ...project.powerLines.map((line) => line.lineNumber),
      nextLineNumber,
    ]),
  ].sort((a, b) => a - b);
  const update = (key: keyof LedwallProject["electrical"], value: number) =>
    onProjectChange((current) => ({ ...current, electrical: { ...current.electrical, [key]: value } }));
  return (
    <>
      <Section title="Impianto 230 V monofase">
        <div className="three-columns">
          <Field label="Volt"><input type="number" value={project.electrical.voltageV} onChange={(event) => update("voltageV", Number(event.target.value))} /></Field>
          <Field label="Ampere"><input type="number" value={project.electrical.breakerA} onChange={(event) => update("breakerA", Number(event.target.value))} /></Field>
          <Field label="Uso %"><input type="number" value={project.electrical.utilizationPercent} onChange={(event) => update("utilizationPercent", Number(event.target.value))} /></Field>
        </div>
        <div className="info-strip">Limite operativo: {(project.electrical.voltageV * project.electrical.breakerA * project.electrical.utilizationPercent / 100).toFixed(0)} W per linea</div>
        <button className="button primary full" onClick={props.onAutoPower}>Distribuisci linee automaticamente</button>
      </Section>
      <Section title="Disegno manuale linee">
        {props.manualPowerLine !== undefined && (
          <div className="trace-banner power-trace">
            <strong>Traccia L-{props.manualPowerLine} attiva</strong>
            <span>Tieni premuto sul cabinet e trascina sugli altri per definire il percorso del cavo elettrico.</span>
          </div>
        )}
        {!selectedCabinet ? (
          <p className="empty-copy">
            Seleziona il primo cabinet sul canvas, poi scegli una linea esistente o creane una nuova.
          </p>
        ) : (
          <>
            <div className="info-strip">
              {selectedCabinets.length} cabinet selezionati · ultimo: {selectedCabinet.row},{selectedCabinet.column}
              {selectedAssignment
                ? ` · L-${selectedAssignment.lineNumber}`
                : " · senza alimentazione"}
            </div>
            <Field label="Linea di partenza">
              <select
                value={commonLineNumber ?? ""}
                onChange={(event) => props.onAssignSelectedCabinetToPowerLine(
                  event.target.value ? Number(event.target.value) : undefined,
                )}
              >
                <option value="">Non assegnato</option>
                {selectableLineNumbers.map((lineNumber) => (
                  <option key={lineNumber} value={lineNumber}>
                    {lineNumber === nextLineNumber
                      ? `Nuova linea ${lineNumber}`
                      : `Linea ${lineNumber}`}
                  </option>
                ))}
              </select>
            </Field>
            <button
              className="button danger full"
              disabled={selectedLineNumbers.size === 0}
              onClick={() => props.onAssignSelectedCabinetToPowerLine(undefined)}
            >
              Rimuovi cabinet dalla linea
            </button>
          </>
        )}
        {props.manualPowerLine !== undefined ? (
          <div className="button-row">
            <button
              className="button secondary grow"
              disabled={!activeTraceLine?.cabinetIds.length}
              onClick={props.onUndoManualPowerTraceStep}
            >
              Annulla ultimo tratto
            </button>
            <button className="button primary grow" onClick={props.onFinishManualPowerTrace}>
              Termina traccia
            </button>
          </div>
        ) : selectedAssignment ? (
          <button
            className="button primary full"
            onClick={() => props.onActivateManualPowerTrace(selectedAssignment.lineNumber)}
          >
            Continua traccia L-{selectedAssignment.lineNumber}
          </button>
        ) : null}
      </Section>
      <Section title={`Linee (${metrics.length})`}>
        <div className="run-list">
          {metrics.map((metric) => (
            <div className={`run-card ${metric.valid ? "" : "invalid"} ${metric.line.lineNumber === props.manualPowerLine ? "active-trace" : ""}`} key={metric.line.id}>
              <div className="run-card-title"><i style={{ background: metric.line.color }} /><strong>Linea {metric.line.lineNumber}</strong><span>{metric.line.cabinetIds.length} cab.</span></div>
              <small>{formatPower(metric.maxW)} max · {formatPower(metric.averageW)} medi</small>
              <button className="mini-button full" onClick={() => props.onActivateManualPowerTrace(metric.line.lineNumber)}>
                Modifica percorso
              </button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function WeightPanel(props: InspectorProps) {
  const { project, libraries, onProjectChange } = props;
  const [plateType, setPlateType] = useState<SupportPlateType>("simple");
  const [flybarModelId, setFlybarModelId] = useState(libraries.flybars[0]?.id ?? "");
  const [flybarMode, setFlybarMode] = useState<FlybarMode>("hanging");
  const [flybarMessage, setFlybarMessage] = useState("");
  const metrics = calculateSuspensionMetrics(project, libraries);
  const screen = project.screens.find((item) => item.id === props.selectedScreenId) ?? project.screens[0];
  const platePlan = screen
    ? createAutomaticSupportPlates(
        screen,
        project.cabinets,
        libraries,
        plateType,
        project.rigging.plateRequirementHeightMm,
      )
    : undefined;
  const update = (key: keyof LedwallProject["rigging"], value: number) =>
    onProjectChange((current) => ({ ...current, rigging: { ...current.rigging, [key]: value } }));
  const total = calculateEstimatedProjectWeightKg(project, libraries);
  const flybarMetrics = calculateFlybarMetrics(project, libraries).filter((metric) =>
    screen?.flybars.some((flybar) => flybar.id === metric.flybar.id),
  );

  function addFlybarsFromSelection(): void {
    if (!screen) return;
    const model = libraries.flybars.find((item) => item.id === flybarModelId);
    const selected = project.cabinets.filter((cabinet) =>
      cabinet.screenId === screen.id && props.selectedCabinetIds.includes(cabinet.id),
    );
    if (!model || !selected.length) {
      setFlybarMessage("Seleziona almeno un cabinet: verrà creata una flybar per ogni colonna selezionata.");
      return;
    }
    if (!model.supportedModes.includes(flybarMode)) {
      setFlybarMessage("La modalità scelta non è prevista dal modello di flybar.");
      return;
    }
    const columns = [...new Set(selected.map((cabinet) => cabinet.column))].sort((a, b) => a - b);
    const screenCabinets = project.cabinets.filter((cabinet) => cabinet.screenId === screen.id);
    const existingCount = screen.flybars.length;
    const flybars = columns.map((column, index) => {
      const columnCabinets = screenCabinets.filter((cabinet) => cabinet.column === column);
      const left = Math.min(...columnCabinets.map((cabinet) => cabinet.physicalXmm));
      const top = Math.min(...columnCabinets.map((cabinet) => cabinet.physicalYmm));
      const bottom = Math.max(...columnCabinets.map((cabinet) => {
        const cabinetModel = libraries.cabinets.find((item) => item.id === cabinet.modelId);
        return cabinet.physicalYmm + (cabinetModel ? cabinetPhysicalSize(cabinet, cabinetModel).height : 0);
      }));
      return {
        id: createId("flybar"),
        modelId: model.id,
        label: `FB${existingCount + index + 1}`,
        mode: flybarMode,
        xMm: left,
        yMm: flybarMode === "hanging" ? top : bottom,
        cabinetIds: columnCabinets.map((cabinet) => cabinet.id),
      };
    });
    onProjectChange((current) => ({
      ...current,
      screens: current.screens.map((item) => item.id === screen.id
        ? { ...item, flybars: [...item.flybars, ...flybars] }
        : item),
    }));
    setFlybarMessage(`${flybars.length} flybar aggiunte manualmente alle colonne selezionate.`);
  }
  return (
    <>
      <Section title="Stime accessori">
        <Field label="Cavi kg/cabinet"><DecimalInput min={0} value={project.rigging.cableKgPerCabinet} onChange={(value) => update("cableKgPerCabinet", value)} /></Field>
        <Field label="U-shape/piastre kg/cabinet"><DecimalInput min={0} value={project.rigging.accessoryKgPerCabinet} onChange={(value) => update("accessoryKgPerCabinet", value)} /></Field>
        <Field
          label="Hardware sospensione kg/punto"
          hint="Quota stimata di hanging bar, giunti e grilli attribuita a ciascun punto; non è la portata del punto."
        ><DecimalInput min={0} value={project.rigging.hangingBarKgPerPoint} onChange={(value) => update("hangingBarKgPerPoint", value)} /></Field>
        <div className="two-columns">
          <Field label="Piastra semplice kg"><DecimalInput min={0} value={project.rigging.simplePlateWeightKg} onChange={(value) => update("simplePlateWeightKg", value)} /></Field>
          <Field label="Piastra aliscaf kg"><DecimalInput min={0} value={project.rigging.aliscafPlateWeightKg} onChange={(value) => update("aliscafPlateWeightKg", value)} /></Field>
        </div>
        <button className="button primary full" onClick={props.onAutoSuspension}>Genera punti per colonna</button>
      </Section>
      <Section title="Accessori">
        <Field
          label="Soglia automatica (m)"
          hint="Genera una piastra in ogni giunto interno 2×2 entro la distanza impostata dal bordo superiore. La funzione è disponibile per tutti i modelli di cabinet."
        >
          <DecimalInput
            min={0}
            value={project.rigging.plateRequirementHeightMm / 1000}
            onChange={(value) => update("plateRequirementHeightMm", value * 1000)}
          />
        </Field>
        <Field label="Tipo piastra">
          <select value={plateType} onChange={(event) => setPlateType(event.target.value as SupportPlateType)}>
            <option value="simple">Piastra semplice</option>
            <option value="aliscaf">Piastra con aliscaf per truss</option>
          </select>
        </Field>
        {platePlan && (
          <div className="info-strip">
            Altezza schermo: {(platePlan.heightMm / 1000).toFixed(2)} m · {platePlan.required ? `${platePlan.plates.length} piastre automatiche previste` : "sotto soglia"}
          </div>
        )}
        <div className="button-row">
          <button className="button primary grow" disabled={!screen} onClick={() => props.onAutoSupportPlates(plateType)}>Genera automatiche</button>
          <button className="button secondary grow" disabled={!screen} onClick={() => props.onAddManualSupportPlate(plateType)}>Aggiungi manuale</button>
        </div>
        {platePlan?.warnings.map((warning) => (
          <p className="warning-copy" key={warning}>{warning}</p>
        ))}
        <div className="run-list">
          {(screen?.supportPlates ?? []).map((plate, index) => (
            <details className="run-card collapsible-card" key={plate.id}>
              <summary className="run-card-title">
                <strong>Piastra {index + 1}</strong>
                <span>{plate.automatic ? "AUTO" : "MANUALE"}</span>
              </summary>
              <div className="collapsible-card-body">
              <Field label="Tipo">
                <select value={plate.type} onChange={(event) => onProjectChange((current) => ({
                  ...current,
                  screens: current.screens.map((item) => item.id === screen?.id ? {
                    ...item,
                    supportPlates: item.supportPlates.map((candidate) => candidate.id === plate.id ? { ...candidate, type: event.target.value as SupportPlateType, automatic: false } : candidate),
                  } : item),
                }))}>
                  <option value="simple">Semplice</option>
                  <option value="aliscaf">Con aliscaf</option>
                </select>
              </Field>
              <small className="drag-hint">Trascina la piastra direttamente sul disegno.</small>
              <button className="button danger full" onClick={() => onProjectChange((current) => ({ ...current, screens: current.screens.map((item) => item.id === screen?.id ? { ...item, supportPlates: item.supportPlates.filter((candidate) => candidate.id !== plate.id) } : item) }))}>Elimina piastra</button>
              </div>
            </details>
          ))}
        </div>
      </Section>
      <Section title="Flybar manuali">
        <Field label="Modello">
          <select value={flybarModelId} onChange={(event) => {
            const id = event.target.value;
            setFlybarModelId(id);
            const model = libraries.flybars.find((item) => item.id === id);
            if (model && !model.supportedModes.includes(flybarMode)) setFlybarMode(model.supportedModes[0] ?? "hanging");
          }}>
            {libraries.flybars.map((model) => <option key={model.id} value={model.id}>{model.manufacturer} {model.name}</option>)}
          </select>
        </Field>
        <Field label="Installazione">
          <select value={flybarMode} onChange={(event) => setFlybarMode(event.target.value as FlybarMode)}>
            <option value="hanging">Sospesa</option>
            <option value="ground">In appoggio</option>
          </select>
        </Field>
        <button className="button primary full" disabled={!screen || !libraries.flybars.length} onClick={addFlybarsFromSelection}>
          Aggiungi alle colonne selezionate
        </button>
        {flybarMessage && <div className="info-strip">{flybarMessage}</div>}
        <p className="warning-copy">Il manuale MG7S consente l'hanging beam sia sospesa sia come supporto a terra. La portata deve essere verificata sul modello reale.</p>
        <div className="run-list">
          {flybarMetrics.map((metric) => (
            <details className={`run-card collapsible-card ${metric.valid ? "" : "invalid"}`} key={metric.flybar.id}>
              <summary className="run-card-title"><strong>{metric.flybar.label}</strong><span>{metric.flybar.mode === "hanging" ? "SOSPESA" : "APPOGGIO"}</span></summary>
              <div className="collapsible-card-body">
              <small>{metric.model?.manufacturer} {metric.model?.name}</small>
              <small><strong>{metric.supportedLoadKg.toFixed(1)} kg supportati / {metric.model?.maxLoadKg.toFixed(1) ?? "0"} kg</strong></small>
              <small>{metric.cabinetWeightKg.toFixed(1)} kg cabinet + {metric.cableAndAccessoryWeightKg.toFixed(1)} kg cavi/accessori + {metric.plateWeightKg.toFixed(1)} kg piastre</small>
              <small>Peso flybar: {metric.flybarWeightKg.toFixed(1)} kg · utilizzo {metric.utilizationPercent.toFixed(1)}%</small>
              <small className="drag-hint">Trascina la flybar direttamente sul disegno.</small>
              <button className="button danger full" onClick={() => onProjectChange((current) => ({ ...current, screens: current.screens.map((item) => item.id === screen?.id ? { ...item, flybars: item.flybars.filter((flybar) => flybar.id !== metric.flybar.id) } : item) }))}>Elimina flybar</button>
              </div>
            </details>
          ))}
        </div>
      </Section>
      <Section title="Carichi stimati">
        <Metric label="Totale sospeso" value={`${total.toFixed(1)} kg`} tone="warn" />
        <div className="run-list">
          {project.screens.flatMap((screen) => screen.suspensionPoints).map((point) => {
            const metric = metrics.find((item) => item.point.id === point.id);
            return (
              <div className="run-card" key={point.id}>
                <div className="run-card-title"><strong>{point.label}</strong><span>{point.cabinetIds.length} cab.</span></div>
                <small>{metric?.cabinetWeightKg.toFixed(1)} kg cabinet</small>
                <small>{metric?.estimatedAccessoryWeightKg.toFixed(1)} kg cavi, accessori e hardware</small>
                <small><strong>{metric?.totalWeightKg.toFixed(1)} kg stimati sul punto</strong></small>
                <Field label="Posizione X mm"><input type="number" value={point.xMm} onChange={(event) => onProjectChange((current) => ({ ...current, screens: current.screens.map((screen) => ({ ...screen, suspensionPoints: screen.suspensionPoints.map((item) => item.id === point.id ? { ...item, xMm: Number(event.target.value) } : item) })) }))} /></Field>
              </div>
            );
          })}
        </div>
        <p className="warning-copy">Stima statica di pre-progettazione. Non sostituisce un calcolo strutturale certificato.</p>
      </Section>
    </>
  );
}

function PixelmapPanel(props: InspectorProps) {
  const { project, selectedScreenId, onProjectChange } = props;
  const screen = project.screens.find((item) => item.id === selectedScreenId) ?? project.screens[0];
  if (!screen) return null;
  const update = (key: keyof typeof screen.pixelmap, value: boolean) =>
    onProjectChange((current) => ({ ...current, screens: current.screens.map((item) => item.id === screen.id ? { ...item, pixelmap: { ...item.pixelmap, [key]: value } } : item) }));
  return (
    <>
      <Section title="Schermo"><Field label="Output selezionato"><select value={screen.id} onChange={(event) => props.onSelectScreen(event.target.value)}>{project.screens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></Section>
      <Section title="Elementi test pattern">
        <Toggle label="Griglia cabinet" checked={screen.pixelmap.showGrid} onChange={(value) => update("showGrid", value)} />
        <Toggle label="Coordinate riga,colonna" checked={screen.pixelmap.showCoordinates} onChange={(value) => update("showCoordinates", value)} />
        <Toggle label="Cerchi" checked={screen.pixelmap.showCircles} onChange={(value) => update("showCircles", value)} />
        <Toggle label="Diagonali" checked={screen.pixelmap.showDiagonals} onChange={(value) => update("showDiagonals", value)} />
        <Toggle label="Barre colore" checked={screen.pixelmap.showColorBars} onChange={(value) => update("showColorBars", value)} />
        <Toggle label="Scala di grigi" checked={screen.pixelmap.showGrayscale} onChange={(value) => update("showGrayscale", value)} />
        <Toggle label="Nome schermo" checked={screen.pixelmap.showScreenName} onChange={(value) => update("showScreenName", value)} />
        <Toggle label="Risoluzione" checked={screen.pixelmap.showResolution} onChange={(value) => update("showResolution", value)} />
        <Toggle label="Logo" checked={screen.pixelmap.showLogo} onChange={(value) => update("showLogo", value)} />
      </Section>
      <Section title="Esporta PNG">
        <button className="button primary full" disabled={props.busy} onClick={props.onExportScreenPng}>Pixelmap schermo nativa</button>
        <button className="button secondary full" disabled={props.busy} onClick={props.onExportMasterPng}>Pixelmap master {project.canvasWidth}×{project.canvasHeight}</button>
      </Section>
    </>
  );
}

function LibraryPanel(props: InspectorProps) {
  const officialLibraryUrl = "https://raw.githubusercontent.com/LorenzoApra/Ledwall-Designer/refs/heads/main/src/data/ledwall-library.csv";
  const { libraries, onLibrariesChange } = props;
  const [kind, setKind] = useState<"cabinet" | "controller" | "flybar" | "accessory">("cabinet");
  const [selectedId, setSelectedId] = useState(libraries.cabinets[0]?.id ?? "");
  const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const [importMessage, setImportMessage] = useState("");
  const [libraryMessage, setLibraryMessage] = useState("");
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState(() =>
    localStorage.getItem("ledwall-designer:remote-library-updated-at:v1") ?? "",
  );
  const cabinetManufacturers = [...new Set(libraries.cabinets.map((entry) => entry.manufacturer).filter(Boolean))].sort();
  const sourceItems = kind === "cabinet"
    ? libraries.cabinets
    : kind === "flybar"
      ? libraries.flybars
      : kind === "accessory"
        ? libraries.accessories
        : libraries.controllers;
  const manufacturers = kind === "controller"
    ? []
    : [...new Set(sourceItems.map((entry) => entry.manufacturer).filter(Boolean))].sort();
  const items = kind === "controller" || manufacturerFilter === "all"
    ? sourceItems
    : sourceItems.filter((entry) => entry.manufacturer === manufacturerFilter);
  const item = items.find((entry) => entry.id === selectedId) ?? items[0];

  function updateCabinet(patch: Partial<CabinetModel>) {
    if (!item || kind !== "cabinet") return;
    onLibrariesChange({ ...libraries, cabinets: libraries.cabinets.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  }
  function updateController(patch: Partial<ControllerModel>) {
    if (!item || kind !== "controller") return;
    onLibrariesChange({ ...libraries, controllers: libraries.controllers.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  }
  function updateFlybar(patch: Partial<FlybarModel>) {
    if (!item || kind !== "flybar") return;
    onLibrariesChange({ ...libraries, flybars: libraries.flybars.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  }
  function updateAccessory(patch: Partial<AccessoryModel>) {
    if (!item || kind !== "accessory") return;
    onLibrariesChange({ ...libraries, accessories: libraries.accessories.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  }
  function addItem() {
    if (kind === "cabinet") {
      const entry: CabinetModel = { id: createId("cabinet-model"), manufacturer: "", name: "Nuovo cabinet", widthMm: 500, heightMm: 500, depthMm: 0, pixelWidth: 128, pixelHeight: 128, pitchMm: 3.9, weightKg: 0, powerMaxW: 0, powerAverageW: 0 };
      onLibrariesChange({ ...libraries, cabinets: [...libraries.cabinets, entry] });
      setSelectedId(entry.id);
    } else if (kind === "controller") {
      const entry: ControllerModel = { id: createId("novastar-model"), manufacturer: "NovaStar", family: "MCTRL", name: "Nuovo controller NovaStar", ethernetPorts: 1, totalCapacityPixels: 650000, maxWidthPixels: 4096, maxHeightPixels: 4096, bandwidthPixelsPerSecond8Bit: 39000000, bandwidthPixelsPerSecondHighBit: 19200000, capabilities: { hdr: false, threeD: false, lowLatency: false, portBackup: true, controllerBackup: true, bitDepths: [8], frameRates: [50, 60] }, sourceUrl: "" };
      onLibrariesChange({ ...libraries, controllers: [...libraries.controllers, entry] });
      setSelectedId(entry.id);
    } else if (kind === "flybar") {
      const entry: FlybarModel = { id: createId("flybar-model"), manufacturer: "", name: "Nuova flybar", widthMm: 500, weightKg: 0, maxLoadKg: 0, supportedModes: ["hanging"] };
      onLibrariesChange({ ...libraries, flybars: [...libraries.flybars, entry] });
      setManufacturerFilter("all");
      setSelectedId(entry.id);
    } else {
      const entry: AccessoryModel = { id: createId("accessory-model"), manufacturer: "", name: "Nuovo accessorio", category: "other", weightKg: 0 };
      onLibrariesChange({ ...libraries, accessories: [...libraries.accessories, entry] });
      setManufacturerFilter("all");
      setSelectedId(entry.id);
    }
  }
  function removeItem() {
    if (!item || sourceItems.length <= 1) return;
    if (kind === "cabinet") onLibrariesChange({ ...libraries, cabinets: libraries.cabinets.filter((entry) => entry.id !== item.id) });
    else if (kind === "controller") onLibrariesChange({ ...libraries, controllers: libraries.controllers.filter((entry) => entry.id !== item.id) });
    else if (kind === "flybar") onLibrariesChange({ ...libraries, flybars: libraries.flybars.filter((entry) => entry.id !== item.id) });
    else onLibrariesChange({ ...libraries, accessories: libraries.accessories.filter((entry) => entry.id !== item.id) });
    setSelectedId(items.find((entry) => entry.id !== item.id)?.id ?? "");
  }

  async function importRcfg(file?: File): Promise<void> {
    if (!file) return;
    try {
      const parsed = parseRcfgFile(file.name, new Uint8Array(await file.arrayBuffer()));
      const lowerName = file.name.toLowerCase();
      const inferredManufacturer = cabinetManufacturers.find((name) => lowerName.includes(name.toLowerCase()));
      const matchingModel = libraries.cabinets.find((entry) =>
        entry.pixelWidth === parsed.pixelWidth &&
        entry.pixelHeight === parsed.pixelHeight &&
        (!inferredManufacturer || entry.manufacturer === inferredManufacturer),
      ) ?? libraries.cabinets.find((entry) =>
        entry.pixelWidth === parsed.pixelWidth && entry.pixelHeight === parsed.pixelHeight,
      );
      const base: CabinetModel = matchingModel
        ? { ...matchingModel }
        : {
            id: "",
            manufacturer: inferredManufacturer ?? "Da definire",
            name: "",
            widthMm: parsed.pixelWidth,
            heightMm: parsed.pixelHeight,
            depthMm: 0,
            pixelWidth: parsed.pixelWidth,
            pixelHeight: parsed.pixelHeight,
            pitchMm: 1,
            weightKg: 0,
            powerMaxW: 0,
            powerAverageW: 0,
          };
      const cleanName = file.name.replace(/\.(?:rcfg|rcfgx|rfcg)$/i, "");
      const entry: CabinetModel = {
        ...base,
        id: createId("cabinet-model"),
        manufacturer: inferredManufacturer ?? base.manufacturer,
        name: cleanName,
        pixelWidth: parsed.pixelWidth,
        pixelHeight: parsed.pixelHeight,
        modulePixelWidth: parsed.modulePixelWidth,
        modulePixelHeight: parsed.modulePixelHeight,
        scan: parsed.scan,
        receivingCard: parsed.receivingCard,
        sourceLabel: `NovaStar RCFG: ${file.name}`,
        notes: [
          base.notes,
          "Importato da configurazione NovaStar. Verificare misure fisiche, pitch, peso e consumi prima dell'uso.",
        ].filter(Boolean).join(" "),
      };
      onLibrariesChange({ ...libraries, cabinets: [...libraries.cabinets, entry] });
      setManufacturerFilter("all");
      setSelectedId(entry.id);
      setImportMessage(
        `Importato ${parsed.pixelWidth}×${parsed.pixelHeight}px${parsed.receivingCard ? ` · ${parsed.receivingCard}` : ""}. Verifica i dati fisici evidenziati nel modello.`,
      );
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function importLibraryCsv(file?: File): Promise<void> {
    if (!file) return;
    try {
      const result = parseLibraryCsv(await file.text(), libraries);
      onLibrariesChange(result.libraries);
      setLibraryMessage(`Libreria importata da ${file.name}: ${formatLibraryCounts(result.counts)}.`);
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function updateFromRemoteLibrary(): Promise<void> {
    try {
      const url = new URL(officialLibraryUrl);
      setLibraryMessage("Download della libreria in corso…");
      const downloadUrl = new URL(url);
      downloadUrl.searchParams.set("ledwall_designer_refresh", String(Date.now()));
      const response = await fetch(downloadUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Download non riuscito: HTTP ${response.status}.`);
      const result = parseLibraryCsv(await response.text(), libraries);
      onLibrariesChange(result.libraries);
      const updatedAt = new Date().toISOString();
      localStorage.removeItem("ledwall-designer:remote-library-url:v1");
      localStorage.setItem("ledwall-designer:remote-library-updated-at:v1", updatedAt);
      setRemoteUpdatedAt(updatedAt);
      setManufacturerFilter("all");
      setSelectedId(
        kind === "cabinet"
          ? result.libraries.cabinets[0]?.id ?? ""
          : kind === "controller"
            ? result.libraries.controllers[0]?.id ?? ""
            : kind === "flybar"
              ? result.libraries.flybars[0]?.id ?? ""
              : result.libraries.accessories[0]?.id ?? "",
      );
      setLibraryMessage(`Libreria aggiornata: ${formatLibraryCounts(result.counts)}. La copia locale è pronta anche offline.`);
    } catch (error) {
      setLibraryMessage(`Libreria locale invariata. ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <>
      <Section title="Libreria condivisa">
        <button className="button primary full" onClick={() => void updateFromRemoteLibrary()}>
          Aggiorna dalla rete
        </button>
        <div className="info-strip">
          In uso: {formatLibraryCounts({
            cabinets: libraries.cabinets.length,
            controllers: libraries.controllers.length,
            flybars: libraries.flybars.length,
            accessories: libraries.accessories.length,
          })}
          {remoteUpdatedAt ? ` · ultimo aggiornamento ${new Date(remoteUpdatedAt).toLocaleString(numberLocale())}` : ""}
        </div>
        <Field label="Importa CSV locale" hint="Puoi usare lo stesso file scaricato da GitHub o modificato con Excel.">
          <input type="file" accept=".csv,text/csv" onChange={(event) => {
            void importLibraryCsv(event.target.files?.[0]);
            event.currentTarget.value = "";
          }} />
        </Field>
        {libraryMessage && <div className="info-strip">{libraryMessage}</div>}
      </Section>
      <div className="segmented library-tabs">
        <button className={kind === "cabinet" ? "active" : ""} onClick={() => { setKind("cabinet"); setManufacturerFilter("all"); setSelectedId(libraries.cabinets[0]?.id ?? ""); }}>Cabinet</button>
        <button className={kind === "controller" ? "active" : ""} onClick={() => { setKind("controller"); setManufacturerFilter("all"); setSelectedId(libraries.controllers[0]?.id ?? ""); }}>Sending Card</button>
        <button className={kind === "flybar" || kind === "accessory" ? "active" : ""} onClick={() => { setKind("flybar"); setManufacturerFilter("all"); setSelectedId(libraries.flybars[0]?.id ?? ""); }}>Accessori</button>
      </div>
      {(kind === "flybar" || kind === "accessory") && (
        <Section title="Tipo accessorio">
          <select value={kind} onChange={(event) => {
            const nextKind = event.target.value as "flybar" | "accessory";
            setKind(nextKind);
            setManufacturerFilter("all");
            setSelectedId(nextKind === "flybar" ? libraries.flybars[0]?.id ?? "" : libraries.accessories[0]?.id ?? "");
          }}>
            <option value="flybar">Flybar</option>
            <option value="accessory">Piastre e altri accessori</option>
          </select>
        </Section>
      )}
      <Section title="Modelli" action={<button className="mini-button" onClick={addItem}>+ Nuovo</button>}>
        {kind !== "controller" && (
          <Field label="Produttore">
            <select value={manufacturerFilter} onChange={(event) => {
              const value = event.target.value;
              setManufacturerFilter(value);
              const next = value === "all" ? sourceItems[0] : sourceItems.find((entry) => entry.manufacturer === value);
              setSelectedId(next?.id ?? "");
            }}>
              <option value="all">Tutti i produttori</option>
              {manufacturers.map((manufacturer) => <option key={manufacturer} value={manufacturer}>{manufacturer}</option>)}
            </select>
          </Field>
        )}
        <select value={item?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{items.map((entry) => <option key={entry.id} value={entry.id}>{"manufacturer" in entry ? `${entry.manufacturer} ` : ""}{entry.name}</option>)}</select>
      </Section>
      {kind === "cabinet" && (
        <Section title="Importa configurazione NovaStar">
          <Field label="File RCFG / RCFGX" hint="Importa risoluzione, moduli, scan e receiving card. I dati meccanici restano modificabili.">
            <input type="file" accept=".rcfg,.rcfgx,.rfcg" onChange={(event) => {
              void importRcfg(event.target.files?.[0]);
              event.currentTarget.value = "";
            }} />
          </Field>
          {importMessage && <div className="info-strip">{importMessage}</div>}
        </Section>
      )}
      {kind === "cabinet" && item && (
        <Section title="Dati cabinet">
          {(() => { const cabinet = item as CabinetModel; return <>
            <div className="two-columns"><Field label="Marca"><input value={cabinet.manufacturer} onChange={(e) => updateCabinet({ manufacturer: e.target.value })} /></Field><Field label="Modello"><input value={cabinet.name} onChange={(e) => updateCabinet({ name: e.target.value })} /></Field></div>
            <div className="three-columns"><NumberField label="L mm" value={cabinet.widthMm} onChange={(value) => updateCabinet({ widthMm: value })} /><NumberField label="H mm" value={cabinet.heightMm} onChange={(value) => updateCabinet({ heightMm: value })} /><NumberField label="P mm" value={cabinet.depthMm} onChange={(value) => updateCabinet({ depthMm: value })} /></div>
            <div className="two-columns"><NumberField label="Pixel W" value={cabinet.pixelWidth} onChange={(value) => updateCabinet({ pixelWidth: value })} /><NumberField label="Pixel H" value={cabinet.pixelHeight} onChange={(value) => updateCabinet({ pixelHeight: value })} /></div>
            <div className="two-columns"><NumberField label="Pitch mm" value={cabinet.pitchMm} step="0.1" onChange={(value) => updateCabinet({ pitchMm: value })} /><NumberField label="Peso kg" value={cabinet.weightKg} step="0.1" onChange={(value) => updateCabinet({ weightKg: value })} /></div>
            <div className="two-columns"><NumberField label="W max" value={cabinet.powerMaxW} onChange={(value) => updateCabinet({ powerMaxW: value })} /><NumberField label="W medi" value={cabinet.powerAverageW} onChange={(value) => updateCabinet({ powerAverageW: value })} /></div>
            <Field label="Receiving card"><input value={cabinet.receivingCard ?? ""} onChange={(e) => updateCabinet({ receivingCard: e.target.value })} /></Field>
            <Field label="Note"><textarea rows={3} value={cabinet.notes ?? ""} onChange={(e) => updateCabinet({ notes: e.target.value })} /></Field>
          </>; })()}
        </Section>
      )}
      {kind === "controller" && item && (
        <Section title="Dati Sending Card">
          {(() => { const controller = item as ControllerModel; return <>
            <Field label="Nome"><input value={controller.name} onChange={(e) => updateController({ name: e.target.value })} /></Field>
            <div className="two-columns"><NumberField label="Porte" value={controller.ethernetPorts} onChange={(value) => updateController({ ethernetPorts: value })} /><NumberField label="Pixel totali" value={controller.totalCapacityPixels} onChange={(value) => updateController({ totalCapacityPixels: value })} /></div>
            <div className="two-columns"><NumberField label="Max width" value={controller.maxWidthPixels} onChange={(value) => updateController({ maxWidthPixels: value })} /><NumberField label="Max height" value={controller.maxHeightPixels} onChange={(value) => updateController({ maxHeightPixels: value })} /></div>
            <NumberField label="Pixel/s porta 8 bit" value={controller.bandwidthPixelsPerSecond8Bit} onChange={(value) => updateController({ bandwidthPixelsPerSecond8Bit: value })} />
            <NumberField label="Pixel/s porta 10/12 bit" value={controller.bandwidthPixelsPerSecondHighBit} onChange={(value) => updateController({ bandwidthPixelsPerSecondHighBit: value })} />
            <Field label="Fonte ufficiale"><input value={controller.sourceUrl} onChange={(e) => updateController({ sourceUrl: e.target.value })} /></Field>
          </>; })()}
        </Section>
      )}
      {kind === "flybar" && item && (
        <Section title="Dati flybar">
          {(() => { const flybar = item as FlybarModel; return <>
            <div className="two-columns"><Field label="Produttore"><input value={flybar.manufacturer} onChange={(event) => updateFlybar({ manufacturer: event.target.value })} /></Field><Field label="Modello"><input value={flybar.name} onChange={(event) => updateFlybar({ name: event.target.value })} /></Field></div>
            <div className="three-columns"><NumberField label="Lunghezza mm" value={flybar.widthMm} onChange={(value) => updateFlybar({ widthMm: value })} /><NumberField label="Peso kg" value={flybar.weightKg} step="0.1" onChange={(value) => updateFlybar({ weightKg: value })} /><NumberField label="Portata kg" value={flybar.maxLoadKg} step="0.1" onChange={(value) => updateFlybar({ maxLoadKg: value })} /></div>
            <Toggle label="Installazione sospesa" checked={flybar.supportedModes.includes("hanging")} onChange={(checked) => updateFlybar({ supportedModes: checked ? [...new Set([...flybar.supportedModes, "hanging" as const])] : flybar.supportedModes.filter((mode) => mode !== "hanging") })} />
            <Toggle label="Installazione in appoggio" checked={flybar.supportedModes.includes("ground")} onChange={(checked) => updateFlybar({ supportedModes: checked ? [...new Set([...flybar.supportedModes, "ground" as const])] : flybar.supportedModes.filter((mode) => mode !== "ground") })} />
            <Field label="Note"><textarea rows={4} value={flybar.notes ?? ""} onChange={(event) => updateFlybar({ notes: event.target.value })} /></Field>
          </>; })()}
        </Section>
      )}
      {kind === "accessory" && item && (
        <Section title="Dati accessorio">
          {(() => { const accessory = item as AccessoryModel; return <>
            <div className="two-columns"><Field label="Produttore"><input value={accessory.manufacturer} onChange={(event) => updateAccessory({ manufacturer: event.target.value })} /></Field><Field label="Nome"><input value={accessory.name} onChange={(event) => updateAccessory({ name: event.target.value })} /></Field></div>
            <Field label="Categoria"><select value={accessory.category} onChange={(event) => updateAccessory({ category: event.target.value as AccessoryModel["category"] })}><option value="connector">Connettore</option><option value="plate">Piastra</option><option value="rigging">Rigging</option><option value="other">Altro</option></select></Field>
            <NumberField label="Peso unitario kg" value={accessory.weightKg} step="0.1" onChange={(value) => updateAccessory({ weightKg: value })} />
            <Field label="Note"><textarea rows={4} value={accessory.notes ?? ""} onChange={(event) => updateAccessory({ notes: event.target.value })} /></Field>
          </>; })()}
        </Section>
      )}
      <div className="button-row library-actions"><button className="button danger grow" disabled={sourceItems.length <= 1} onClick={removeItem}>Elimina modello</button><button className="button secondary grow" onClick={props.onResetLibraries}>Ripristina</button></div>
    </>
  );
}

function OutputPanel(props: InspectorProps) {
  const totals = useMemo(() => calculateProjectTotals(props.project, props.libraries), [props.project, props.libraries]);
  return (
    <>
      <Section title="Stato progetto">
        <div className="info-grid"><Metric label="Schermi" value={String(totals.screenCount)} /><Metric label="Cabinet" value={String(totals.cabinetCount)} /><Metric label="Pixel" value={formatInt(totals.pixels)} /><Metric label="Potenza max" value={`${(totals.maxW / 1000).toFixed(2)} kW`} /><Metric label="Peso stimato" value={`${totals.totalEstimatedWeightKg.toFixed(1)} kg`} /></div>
      </Section>
      <Section title="Documentazione PDF">
        <button className="button primary full" disabled={props.busy} onClick={props.onExportTechnicalPdf}>PDF tecnico + distinta</button>
        <button className="button secondary full" disabled={props.busy} onClick={props.onExportWiringPdf}>PDF cablaggi A3</button>
      </Section>
      <Section title="Pixelmap PNG">
        <button className="button primary full" disabled={props.busy} onClick={props.onExportScreenPng}>Schermo selezionato</button>
        <button className="button secondary full" disabled={props.busy} onClick={props.onExportMasterPng}>Canvas master</button>
      </Section>
    </>
  );
}

function NumberField({ label, value, onChange, step = "1" }: { label: string; value: number; onChange: (value: number) => void; step?: string }) {
  return (
    <Field label={label}>
      {step === "1"
        ? <input type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        : <DecimalInput value={value} onChange={onChange} />}
    </Field>
  );
}

function panelTitle(panel: InspectorPanel): string {
  return { project: "Progetto", design: "Disegno", data: "Segnale dati", power: "Elettrico", weight: "Peso e rigging", pixelmap: "Pixelmap", library: "Librerie", output: "Output" }[panel];
}

function panelEyebrow(panel: InspectorPanel): string {
  return { project: "Dati generali", design: "Canvas e cabinet", data: "NovaStar", power: "230 V monofase", weight: "Stima statica", pixelmap: "Pixel-to-pixel", library: "Database locale", output: "Consegna" }[panel];
}

function formatInt(value: number): string {
  return new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 0 }).format(value);
}

function formatPower(valueW: number): string {
  return valueW >= 1000
    ? `${new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 2 }).format(valueW / 1000)} kW`
    : `${formatInt(valueW)} W`;
}

function formatLibraryCounts(counts: { cabinets: number; controllers: number; flybars: number; accessories: number }): string {
  return `${counts.cabinets} cabinet, ${counts.controllers} Sending Card, ${counts.flybars} flybar, ${counts.accessories} altri accessori`;
}
