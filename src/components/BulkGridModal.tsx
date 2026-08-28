import { useState } from "react";
import type { AppLibraries, Rotation } from "../domain/types";
import { Field } from "./Ui";

export interface BulkGridValues {
  modelId: string;
  rows: number;
  columns: number;
  rotation: Rotation;
  startPixelX: number;
  startPixelY: number;
  replaceExisting: boolean;
}

export function BulkGridModal({
  libraries,
  onClose,
  onCreate,
}: {
  libraries: AppLibraries;
  onClose: () => void;
  onCreate: (values: BulkGridValues) => void;
}) {
  const [values, setValues] = useState<BulkGridValues>({
    modelId: libraries.cabinets[0]?.id ?? "",
    rows: 8,
    columns: 5,
    rotation: 0,
    startPixelX: 0,
    startPixelY: 0,
    replaceExisting: true,
  });
  const model = libraries.cabinets.find((item) => item.id === values.modelId);
  const width = model
    ? (values.rotation === 90 || values.rotation === 270 ? model.pixelHeight : model.pixelWidth) * values.columns
    : 0;
  const height = model
    ? (values.rotation === 90 || values.rotation === 270 ? model.pixelWidth : model.pixelHeight) * values.rows
    : 0;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Generazione bulk</span>
            <h2>Crea matrice cabinet</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Chiudi">×</button>
        </div>
        <div className="modal-body grid-form">
          <Field label="Modello cabinet">
            <select value={values.modelId} onChange={(event) => setValues({ ...values, modelId: event.target.value })}>
              {libraries.cabinets.map((item) => (
                <option key={item.id} value={item.id}>{item.manufacturer} {item.name}</option>
              ))}
            </select>
          </Field>
          <div className="two-columns">
            <Field label="Righe">
              <input type="number" min="1" max="200" value={values.rows} onChange={(event) => setValues({ ...values, rows: Number(event.target.value) })} />
            </Field>
            <Field label="Colonne">
              <input type="number" min="1" max="200" value={values.columns} onChange={(event) => setValues({ ...values, columns: Number(event.target.value) })} />
            </Field>
          </div>
          <Field label="Rotazione">
            <select value={values.rotation} onChange={(event) => setValues({ ...values, rotation: Number(event.target.value) as Rotation })}>
              {[0, 90, 180, 270].map((rotation) => <option key={rotation} value={rotation}>{rotation}°</option>)}
            </select>
          </Field>
          <div className="two-columns">
            <Field label="X iniziale (px)">
              <input type="number" min="0" value={values.startPixelX} onChange={(event) => setValues({ ...values, startPixelX: Number(event.target.value) })} />
            </Field>
            <Field label="Y iniziale (px)">
              <input type="number" min="0" value={values.startPixelY} onChange={(event) => setValues({ ...values, startPixelY: Number(event.target.value) })} />
            </Field>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={values.replaceExisting} onChange={(event) => setValues({ ...values, replaceExisting: event.target.checked })} />
            Sostituisci i cabinet già presenti nello schermo
          </label>
          <div className="bulk-preview">
            <span>Risultato</span>
            <strong>{values.columns} × {values.rows} cabinet</strong>
            <span>{width} × {height} pixel</span>
            {model && <span>{(values.columns * model.widthMm / 1000).toFixed(2)} × {(values.rows * model.heightMm / 1000).toFixed(2)} m</span>}
          </div>
        </div>
        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>Annulla</button>
          <button className="button primary" disabled={!values.modelId || values.rows < 1 || values.columns < 1} onClick={() => onCreate(values)}>Crea matrice</button>
        </div>
      </div>
    </div>
  );
}

