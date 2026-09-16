import type {
  CompareOperator,
  DatasetKey,
  FilterState,
  NumericFilter,
  SortKey,
  ViewMode,
} from "./types";
import { emptyNumericFilter } from "./types";

export type MapCamera = {
  z: number;
  lat: number;
  lon: number;
};

export type AppUrlState = {
  dataset: DatasetKey;
  view: ViewMode;
  camera: MapCamera | null;
  selectedIds: string[];
  selectedIndex: number;
  filters: FilterState;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
};

export function createDefaultFilters(): FilterState {
  return {
    bundeslaender: [],
    bezeichnungen: [],
    bemerkungen: [],
    siedlungsanteil: emptyNumericFilter(),
    einwohnerzahl: emptyNumericFilter(),
    flaeche: emptyNumericFilter(),
    search: "",
  };
}

const DEFAULT_SORT_KEY: SortKey = "siedlungsanteil";
const DEFAULT_SORT_DIR: "asc" | "desc" = "desc";

const SORT_KEYS = new Set<SortKey>([
  "name",
  "bezeichnung",
  "bemerkung",
  "bundesland",
  "regionalschluessel",
  "siedlungsanteil",
  "einwohnerzahl",
  "flaeche",
]);

const OPS = new Set<CompareOperator>(["<", ">", "<=", ">=", "="]);

function encodeEbene(dataset: DatasetKey): string {
  return dataset === "gemeinden" ? "gem" : "vwg";
}

function decodeEbene(raw: string | null): DatasetKey | undefined {
  if (raw === "gem") return "gemeinden";
  if (raw === "vwg") return "verwaltungsgemeinschaften";
  return undefined;
}

function encodeAnsicht(view: ViewMode): string {
  return view;
}

function decodeAnsicht(raw: string | null): ViewMode | undefined {
  if (raw === "map" || raw === "list") return raw;
  return undefined;
}

export function encodeMapCamera(camera: MapCamera): string {
  const z = Number.isInteger(camera.z)
    ? String(camera.z)
    : camera.z.toFixed(2).replace(/\.?0+$/, "");
  return `${z}/${camera.lat.toFixed(5)}/${camera.lon.toFixed(5)}`;
}

export function decodeMapCamera(raw: string | null): MapCamera | null {
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  const z = Number(parts[0]);
  const lat = Number(parts[1]);
  const lon = Number(parts[2]);
  if (![z, lat, lon].every((n) => Number.isFinite(n))) return null;
  if (z < 0 || z > 22 || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { z, lat, lon };
}

function encodeMulti(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.join(",");
}

function decodeMulti(raw: string | null): string[] | undefined {
  if (raw === null) return undefined;
  if (raw === "") return [];
  return raw.split(",").filter(Boolean);
}

function encodeNumeric(filter: NumericFilter): string | null {
  const empty = emptyNumericFilter();
  const aActive = filter.a.value.trim() !== "";
  const bActive = filter.bEnabled && filter.b.value.trim() !== "";
  if (!aActive && !filter.bEnabled && !bActive) {
    if (filter.a.op === empty.a.op && filter.b.op === empty.b.op) return null;
  }
  if (!aActive && !filter.bEnabled) return null;

  const parts = [filter.a.op, filter.a.value];
  if (filter.bEnabled) {
    parts.push("1", filter.b.op, filter.b.value);
  }
  return parts.join("|");
}

function decodeNumeric(raw: string | null): NumericFilter | undefined {
  if (raw === null || raw === "") return undefined;
  const parts = raw.split("|");
  if (parts.length !== 2 && parts.length !== 5) return undefined;
  const opA = parts[0] as CompareOperator;
  if (!OPS.has(opA)) return undefined;
  const filter = emptyNumericFilter();
  filter.a = { op: opA, value: parts[1] ?? "" };
  if (parts.length === 5 && parts[2] === "1") {
    const opB = parts[3] as CompareOperator;
    if (!OPS.has(opB)) return undefined;
    filter.bEnabled = true;
    filter.b = { op: opB, value: parts[4] ?? "" };
  }
  return filter;
}

export function parseUrlState(search: string): Partial<AppUrlState> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const partial: Partial<AppUrlState> = {};

  const dataset = decodeEbene(params.get("ebene"));
  if (dataset) partial.dataset = dataset;

  const view = decodeAnsicht(params.get("ansicht"));
  if (view) partial.view = view;

  const camera = decodeMapCamera(params.get("map"));
  if (camera) partial.camera = camera;

  const sel = params.get("sel");
  if (sel !== null) {
    partial.selectedIds = sel === "" ? [] : sel.split(",").filter(Boolean);
  }

  const siRaw = params.get("si");
  if (siRaw !== null) {
    const si = Number(siRaw);
    if (Number.isInteger(si) && si >= 0) partial.selectedIndex = si;
  }

  const filters: FilterState = createDefaultFilters();
  let filtersTouched = false;

  const bl = decodeMulti(params.get("bl"));
  if (bl !== undefined) {
    filters.bundeslaender = bl;
    filtersTouched = true;
  }
  const bz = decodeMulti(params.get("bz"));
  if (bz !== undefined) {
    filters.bezeichnungen = bz;
    filtersTouched = true;
  }
  const bm = decodeMulti(params.get("bm"));
  if (bm !== undefined) {
    filters.bemerkungen = bm;
    filtersTouched = true;
  }

  const sa = decodeNumeric(params.get("sa"));
  if (sa) {
    filters.siedlungsanteil = sa;
    filtersTouched = true;
  }
  const ew = decodeNumeric(params.get("ew"));
  if (ew) {
    filters.einwohnerzahl = ew;
    filtersTouched = true;
  }
  const fl = decodeNumeric(params.get("fl"));
  if (fl) {
    filters.flaeche = fl;
    filtersTouched = true;
  }

  if (params.has("q")) {
    filters.search = params.get("q") ?? "";
    filtersTouched = true;
  }

  if (filtersTouched) partial.filters = filters;

  const sk = params.get("sk");
  if (sk && SORT_KEYS.has(sk as SortKey)) partial.sortKey = sk as SortKey;

  const sd = params.get("sd");
  if (sd === "asc" || sd === "desc") partial.sortDir = sd;

  return partial;
}

export function buildSearchParams(state: AppUrlState): string {
  const params = new URLSearchParams();

  if (state.dataset !== "gemeinden") params.set("ebene", encodeEbene(state.dataset));
  if (state.view !== "map") params.set("ansicht", encodeAnsicht(state.view));

  if (state.camera) params.set("map", encodeMapCamera(state.camera));

  if (state.selectedIds.length > 0) params.set("sel", state.selectedIds.join(","));
  if (state.selectedIds.length > 1 && state.selectedIndex > 0) {
    params.set("si", String(state.selectedIndex));
  }

  const f = state.filters;
  const bl = encodeMulti(f.bundeslaender);
  if (bl !== null) params.set("bl", bl);
  const bz = encodeMulti(f.bezeichnungen);
  if (bz !== null) params.set("bz", bz);
  const bm = encodeMulti(f.bemerkungen);
  if (bm !== null) params.set("bm", bm);

  const sa = encodeNumeric(f.siedlungsanteil);
  if (sa !== null) params.set("sa", sa);
  const ew = encodeNumeric(f.einwohnerzahl);
  if (ew !== null) params.set("ew", ew);
  const fl = encodeNumeric(f.flaeche);
  if (fl !== null) params.set("fl", fl);

  if (f.search.trim() !== "") params.set("q", f.search);

  if (state.sortKey !== DEFAULT_SORT_KEY) params.set("sk", state.sortKey);
  if (state.sortDir !== DEFAULT_SORT_DIR) params.set("sd", state.sortDir);

  // URLSearchParams escaped /, ,, | und Vergleichszeichen – für lesbare Deep Links zurücksetzen
  // (wie OSM map=z/lat/lon; Parsing via URLSearchParams.get bleibt kompatibel).
  return params
    .toString()
    .replace(/%2F/gi, "/")
    .replace(/%2C/gi, ",")
    .replace(/%7C/gi, "|")
    .replace(/%3C/gi, "<")
    .replace(/%3E/gi, ">")
    .replace(/%3D/gi, "=");
}

export function replaceUrlSearch(search: string): void {
  const url = new URL(window.location.href);
  const path = search ? `${url.pathname}?${search}${url.hash}` : `${url.pathname}${url.hash}`;
  if (`${url.pathname}${url.search}${url.hash}` === path) return;
  window.history.replaceState(window.history.state, "", path);
}

export function camerasEqual(a: MapCamera | null, b: MapCamera | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return (
    Math.abs(a.z - b.z) < 0.01 &&
    Math.abs(a.lat - b.lat) < 1e-5 &&
    Math.abs(a.lon - b.lon) < 1e-5
  );
}
