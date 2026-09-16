export type DatasetKey = "gemeinden" | "verwaltungsgemeinschaften";
export type ViewMode = "map" | "list";
export type CompareOperator = "<" | ">" | "<=" | ">=" | "=";
/** @deprecated Use CompareOperator */
export type AnteilOperator = CompareOperator;
export type SortKey =
  | "name"
  | "bezeichnung"
  | "bemerkung"
  | "bundesland"
  | "regionalschluessel"
  | "siedlungsanteil"
  | "einwohnerzahl"
  | "flaeche";

export type FeatureRecord = {
  name: string;
  bezeichnung: string;
  bemerkung: string;
  bundesland: string;
  regionalschluessel: string;
  siedlungsanteil: number;
  /** Einwohnerzahl (EWZ) */
  einwohnerzahl: number;
  /** Verwaltungsfläche in km² (aus Flaeche in m²) */
  flaeche: number;
  /** [west, south, east, north] in WGS84 */
  bbox?: [number, number, number, number];
};

export type NumericClause = {
  op: CompareOperator;
  value: string;
};

export type NumericFilter = {
  a: NumericClause;
  /** Zweiter Vergleich; nur wenn enabled und value gesetzt */
  bEnabled: boolean;
  b: NumericClause;
};

export type FilterState = {
  bundeslaender: string[];
  bezeichnungen: string[];
  bemerkungen: string[];
  siedlungsanteil: NumericFilter;
  einwohnerzahl: NumericFilter;
  flaeche: NumericFilter;
  search: string;
};

export function emptyNumericFilter(): NumericFilter {
  return {
    a: { op: ">=", value: "" },
    bEnabled: false,
    b: { op: "<=", value: "" },
  };
}
