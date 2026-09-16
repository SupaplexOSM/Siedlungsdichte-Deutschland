import { useEffect, useRef, useState } from "react";
import { FILTER_NONE } from "../filters";
import type { CompareOperator, FilterState, NumericFilter } from "../types";
import { emptyNumericFilter } from "../types";

type Props = {
  filters: FilterState;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  bundeslaender: string[];
  bezeichnungen: string[];
  bemerkungen: string[];
  onChange: (next: FilterState) => void;
};

const OPERATORS: { value: CompareOperator; label: string }[] = [
  { value: ">=", label: "≥" },
  { value: "<=", label: "≤" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "=", label: "=" },
];

export function Filters({
  filters,
  searchInput,
  onSearchInputChange,
  bundeslaender,
  bezeichnungen,
  bemerkungen,
  onChange,
}: Props) {
  return (
    <div className="filters">
      <label className="filter-field">
        <span className="filter-label">Name / Regionalschlüssel</span>
        <span className="filter-input-wrap">
          <input
            type="search"
            placeholder="Suchen…"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            aria-label="Suche nach Name oder Regionalschlüssel"
          />
          {searchInput !== "" && (
            <button
              type="button"
              className="field-clear"
              aria-label="Suche zurücksetzen"
              title="Suche zurücksetzen"
              onClick={(event) => {
                event.preventDefault();
                onSearchInputChange("");
              }}
            >
              ×
            </button>
          )}
        </span>
      </label>
      <MultiSelect
        label="Bundesland"
        options={bundeslaender}
        selected={filters.bundeslaender}
        onChange={(bundeslaender) => onChange({ ...filters, bundeslaender })}
      />
      <MultiSelect
        label="Bezeichnung"
        options={bezeichnungen}
        selected={filters.bezeichnungen}
        onChange={(bezeichnungen) => onChange({ ...filters, bezeichnungen })}
      />
      <MultiSelect
        label="Bemerkung"
        options={bemerkungen}
        selected={filters.bemerkungen}
        onChange={(bemerkungen) => onChange({ ...filters, bemerkungen })}
      />
      <NumericFilterField
        label="Siedlungsgebietsanteil"
        unit="%"
        value={filters.siedlungsanteil}
        onChange={(siedlungsanteil) => onChange({ ...filters, siedlungsanteil })}
      />
      <NumericFilterField
        label="Einwohnerzahl"
        value={filters.einwohnerzahl}
        onChange={(einwohnerzahl) => onChange({ ...filters, einwohnerzahl })}
      />
      <NumericFilterField
        label="Fläche"
        unit="km²"
        value={filters.flaeche}
        onChange={(flaeche) => onChange({ ...filters, flaeche })}
      />
    </div>
  );
}

function NumericFilterField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: NumericFilter;
  onChange: (next: NumericFilter) => void;
}) {
  const title = unit ? `${label} (${unit})` : label;

  const setClause = (which: "a" | "b", patch: Partial<NumericFilter["a"]>) => {
    onChange({
      ...value,
      [which]: { ...value[which], ...patch },
    });
  };

  const onSecondEnabledChange = (enabled: boolean) => {
    if (enabled) {
      onChange({ ...value, bEnabled: true });
    } else {
      onChange({
        ...value,
        bEnabled: false,
        b: { op: "<=", value: "" },
      });
    }
  };

  const clearAll = () => onChange(emptyNumericFilter());
  const hasActive = value.a.value !== "" || value.bEnabled;

  return (
    <div className="filter-field numeric-filter">
      <div className="numeric-filter-head">
        <span className="filter-label">{title}</span>
        {hasActive && (
          <button
            type="button"
            className="numeric-reset"
            onClick={clearAll}
            title="Filter zurücksetzen"
          >
            Zurücksetzen
          </button>
        )}
      </div>
      <div className="numeric-row">
        <NumericClauseInputs
          clause={value.a}
          label={`${label} Vergleich 1`}
          onOpChange={(op) => setClause("a", { op })}
          onValueChange={(v) => setClause("a", { value: v })}
          onClear={() => setClause("a", { value: "" })}
        />
        <label className="numeric-enable" title="Zweiten Schwellwert aktivieren">
          <input
            type="checkbox"
            checked={value.bEnabled}
            onChange={(event) => onSecondEnabledChange(event.target.checked)}
            aria-label={`${label} zweiten Schwellwert aktivieren`}
          />
        </label>
        <NumericClauseInputs
          clause={value.b}
          label={`${label} Vergleich 2`}
          disabled={!value.bEnabled}
          onOpChange={(op) => setClause("b", { op })}
          onValueChange={(v) => setClause("b", { value: v })}
          onClear={() => setClause("b", { value: "" })}
        />
      </div>
    </div>
  );
}

function NumericClauseInputs({
  clause,
  label,
  disabled = false,
  onOpChange,
  onValueChange,
  onClear,
}: {
  clause: NumericFilter["a"];
  label: string;
  disabled?: boolean;
  onOpChange: (op: CompareOperator) => void;
  onValueChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <span className={`numeric-clause${disabled ? " is-disabled" : ""}`}>
      <select
        className="numeric-op"
        value={clause.op}
        disabled={disabled}
        onChange={(event) => onOpChange(event.target.value as CompareOperator)}
        aria-label={`${label} Operator`}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      <span className="filter-input-wrap numeric-value">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Wert"
          value={clause.value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          aria-label={`${label} Wert`}
        />
        {!disabled && clause.value !== "" && (
          <button
            type="button"
            className="field-clear"
            aria-label={`${label} zurücksetzen`}
            title="Wert löschen"
            onClick={(event) => {
              event.preventDefault();
              onClear();
            }}
          >
            ×
          </button>
        )}
      </span>
    </span>
  );
}

function isNone(selected: string[]): boolean {
  return selected.length === 1 && selected[0] === FILTER_NONE;
}

function isAll(selected: string[]): boolean {
  return selected.length === 0;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const summary = isAll(selected)
    ? "alle"
    : isNone(selected)
      ? "keine"
      : selected.length === options.length
        ? "alle"
        : `${selected.length} gewählt`;

  const isChecked = (option: string): boolean => {
    if (isAll(selected)) return true;
    if (isNone(selected)) return false;
    return selected.includes(option);
  };

  const toggle = (value: string) => {
    if (isAll(selected)) {
      onChange(options.filter((item) => item !== value));
      return;
    }
    if (isNone(selected)) {
      onChange([value]);
      return;
    }
    if (selected.includes(value)) {
      const next = selected.filter((item) => item !== value);
      onChange(next.length === 0 ? [FILTER_NONE] : next);
    } else {
      const next = [...selected, value];
      onChange(next.length === options.length ? [] : next);
    }
  };

  return (
    <div className="multiselect" ref={rootRef}>
      <button type="button" className="multiselect-btn" onClick={() => setOpen((v) => !v)}>
        <span className="multiselect-label filter-label">{label}</span>
        <span>{summary}</span>
      </button>
      {open && (
        <div className="multiselect-menu" role="listbox" aria-multiselectable="true">
          <div className="multiselect-actions">
            <button type="button" onClick={() => onChange([])}>
              Alle anwählen
            </button>
            <button type="button" onClick={() => onChange([FILTER_NONE])}>
              Alle abwählen
            </button>
          </div>
          {options.map((option) => (
            <label key={option} className="check">
              <input type="checkbox" checked={isChecked(option)} onChange={() => toggle(option)} />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
