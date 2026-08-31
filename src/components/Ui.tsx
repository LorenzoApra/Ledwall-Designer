import { useEffect, useRef, useState, type ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="inspector-section">
      <div className="section-heading">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-row ${disabled ? "disabled" : ""}`}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? "on" : ""}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span />
      </button>
    </label>
  );
}

export function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "good" | "warn" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function DecimalInput({
  value,
  onChange,
  min,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(formatDecimal(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(formatDecimal(value));
  }, [value]);

  function commit(): void {
    focused.current = false;
    const parsed = Number(draft.trim().replace(",", "."));
    if (Number.isFinite(parsed) && (min === undefined || parsed >= min)) {
      onChange(parsed);
      setDraft(formatDecimal(parsed));
    } else {
      setDraft(formatDecimal(value));
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => { focused.current = true; }}
      onChange={(event) => {
        const next = event.target.value;
        if (/^-?\d*(?:[.,]\d*)?$/.test(next)) setDraft(next);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function formatDecimal(value: number): string {
  return String(value).replace(".", ",");
}
