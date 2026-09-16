import type { FilterSpecification } from "maplibre-gl";
import type {
  CompareOperator,
  FeatureRecord,
  FilterState,
  NumericClause,
  NumericFilter,
  SortKey,
} from "./types";

/** Leeres Array = alle; dieses Token = keine Auswahl. */
export const FILTER_NONE = "__none__";

function isAllSelected(selected: string[]): boolean {
  return selected.length === 0;
}

function isNoneSelected(selected: string[]): boolean {
  return selected.length === 1 && selected[0] === FILTER_NONE;
}

function matchesMulti(selected: string[], value: string): boolean {
  if (isAllSelected(selected)) return true;
  if (isNoneSelected(selected)) return false;
  return selected.includes(value);
}

function parseFilterNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

function matchesClause(value: number, clause: NumericClause): boolean {
  const n = parseFilterNumber(clause.value);
  if (n === null) return true;
  switch (clause.op) {
    case "<":
      return value < n;
    case ">":
      return value > n;
    case "<=":
      return value <= n;
    case ">=":
      return value >= n;
    case "=":
      return value === n;
  }
}

export function matchesNumeric(value: number, filter: NumericFilter): boolean {
  if (!matchesClause(value, filter.a)) return false;
  if (filter.bEnabled && !matchesClause(value, filter.b)) return false;
  return true;
}

function clauseMapFilter(
  field: string,
  clause: NumericClause,
): FilterSpecification | null {
  const n = parseFilterNumber(clause.value);
  if (n === null) return null;
  const mapOp = clause.op === "=" ? "==" : clause.op;
  return [mapOp, ["to-number", ["get", field]], n];
}

export function numericMapFilter(
  field: string,
  filter: NumericFilter,
): FilterSpecification | null {
  const parts: FilterSpecification[] = [];
  const a = clauseMapFilter(field, filter.a);
  if (a) parts.push(a);
  if (filter.bEnabled) {
    const b = clauseMapFilter(field, filter.b);
    if (b) parts.push(b);
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return ["all", ...parts] as FilterSpecification;
}

const COMPARE_OP_LABEL: Record<CompareOperator, string> = {
  ">=": ">=",
  "<=": "<=",
  ">": ">",
  "<": "<",
  "=": "=",
};

function describeClause(clause: NumericClause, unitSuffix: string): string | null {
  const n = parseFilterNumber(clause.value);
  if (n === null && clause.value.trim() === "") return null;
  if (n === null) return null;
  const formatted = String(clause.value.trim());
  return `${COMPARE_OP_LABEL[clause.op]} ${formatted}${unitSuffix}`;
}

function describeNumeric(
  label: string,
  filter: NumericFilter,
  unitSuffix: string,
): string | null {
  const parts: string[] = [];
  const a = describeClause(filter.a, unitSuffix);
  if (a) parts.push(a);
  if (filter.bEnabled) {
    const b = describeClause(filter.b, unitSuffix);
    if (b) parts.push(b);
  }
  if (parts.length === 0) return null;
  return `${label}: ${parts.join(" und ")}`;
}

function describeMulti(label: string, selected: string[]): string | null {
  if (isAllSelected(selected)) return null;
  if (isNoneSelected(selected)) return `${label}: keine`;
  return `${label}: ${selected.join(", ")}`;
}

/** Mindestens ein Filter aktiv (MultiSelect, numerisch oder Suche). */
export function hasActiveFilters(filters: FilterState, searchInput?: string): boolean {
  if (!isAllSelected(filters.bundeslaender)) return true;
  if (!isAllSelected(filters.bezeichnungen)) return true;
  if (!isAllSelected(filters.bemerkungen)) return true;
  if (filters.siedlungsanteil.a.value !== "" || filters.siedlungsanteil.bEnabled) return true;
  if (filters.einwohnerzahl.a.value !== "" || filters.einwohnerzahl.bEnabled) return true;
  if (filters.flaeche.a.value !== "" || filters.flaeche.bEnabled) return true;
  const q = (searchInput ?? filters.search).trim();
  return q !== "";
}

/** Lesbare Zusammenfassung aktiver Filter für Export/Hinweise. */
export function describeActiveFilters(filters: FilterState): string {
  const parts: string[] = [];
  const bundesland = describeMulti("Bundesland", filters.bundeslaender);
  const bezeichnung = describeMulti("Bezeichnung", filters.bezeichnungen);
  const bemerkung = describeMulti("Bemerkung", filters.bemerkungen);
  if (bundesland) parts.push(bundesland);
  if (bezeichnung) parts.push(bezeichnung);
  if (bemerkung) parts.push(bemerkung);

  // ASCII-sichere Labels fuer PDF (Standard-Schrift von jsPDF)
  const anteil = describeNumeric("Siedlungsgebietsanteil", filters.siedlungsanteil, " %");
  const einwohner = describeNumeric("Einwohnerzahl", filters.einwohnerzahl, "");
  const flaeche = describeNumeric("Flaeche", filters.flaeche, " km2");
  if (anteil) parts.push(anteil);
  if (einwohner) parts.push(einwohner);
  if (flaeche) parts.push(flaeche);

  const search = filters.search.trim();
  if (search) parts.push(`Suche: "${search}"`);

  if (parts.length === 0) return "Keine Filter aktiv.";
  return `Filter: ${parts.join(" | ")}`;
}

export function matchesFilters(record: FeatureRecord, filters: FilterState): boolean {
  if (!matchesMulti(filters.bundeslaender, record.bundesland)) return false;
  if (!matchesMulti(filters.bezeichnungen, record.bezeichnung)) return false;
  if (!matchesMulti(filters.bemerkungen, record.bemerkung)) return false;
  if (!matchesNumeric(record.siedlungsanteil, filters.siedlungsanteil)) return false;
  if (!matchesNumeric(record.einwohnerzahl, filters.einwohnerzahl)) return false;
  if (!matchesNumeric(record.flaeche, filters.flaeche)) return false;
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const hay = `${record.name} ${record.regionalschluessel}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function sortRecords(
  records: FeatureRecord[],
  key: SortKey,
  direction: "asc" | "desc",
): FeatureRecord[] {
  const copy = [...records];
  copy.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv), "de");
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return copy;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "de"));
}

function multiMapFilter(field: string, selected: string[]): FilterSpecification | null {
  if (isAllSelected(selected)) return null;
  if (isNoneSelected(selected)) return ["==", ["get", field], "__impossible__"];
  return ["in", ["get", field], ["literal", selected]];
}

export function buildMapFilter(filters: FilterState): FilterSpecification | null {
  const parts: FilterSpecification[] = [];

  for (const part of [
    multiMapFilter("bundesland", filters.bundeslaender),
    multiMapFilter("bezeichnung", filters.bezeichnungen),
    multiMapFilter("bemerkung", filters.bemerkungen),
    numericMapFilter("siedlungsanteil", filters.siedlungsanteil),
    numericMapFilter("einwohnerzahl", filters.einwohnerzahl),
    numericMapFilter("flaeche", filters.flaeche),
  ]) {
    if (part) parts.push(part);
  }

  const q = filters.search.trim().toLowerCase();
  if (q) {
    parts.push([
      "any",
      [">=", ["index-of", q, ["downcase", ["to-string", ["get", "name"]]]], 0],
      [">=", ["index-of", q, ["downcase", ["to-string", ["get", "regionalschluessel"]]]], 0],
    ]);
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return ["all", ...parts] as FilterSpecification;
}
