export const CHOROPLETH_CLASSES = [
  { min: 0, max: 5, color: "rgb(252,253,191)", label: "0 – 5" },
  { min: 5, max: 7.5, color: "rgb(254,201,141)", label: "5 – 7,5" },
  { min: 7.5, max: 10, color: "rgb(253,149,103)", label: "7,5 – 10" },
  { min: 10, max: 12.5, color: "rgb(241,96,93)", label: "10 – 12,5" },
  { min: 12.5, max: 15, color: "rgb(205,63,113)", label: "12,5 – 15" },
  { min: 15, max: 17.5, color: "rgb(158,47,127)", label: "15 – 17,5" },
  { min: 17.5, max: 20, color: "rgb(114,31,129)", label: "17,5 – 20" },
  { min: 20, max: 22.5, color: "rgb(69,15,118)", label: "20 – 22,5" },
  { min: 22.5, max: 25, color: "rgb(24,15,62)", label: "22,5 – 25" },
  { min: 25, max: Infinity, color: "rgb(0,0,4)", label: "≥ 25" },
] as const;

/** Unauffälliges Mittelgrau – lesbar auf hellen und dunklen Choropleth-Farben. */
export const OUTLINE_COLOR = "#8b8b8b";
export const OUTLINE_WIDTH = 0.35;
export const OUTLINE_OPACITY = 0.55;
export const FILL_OPACITY = 0.92;

/** Auswahl: Weißer Halo + Cyan – kontrastiert zu Gelb–Magenta–Violett der Choropleth. */
export const SELECTION_HALO_COLOR = "#ffffff";
export const SELECTION_HALO_WIDTH = 6;
export const SELECTION_COLOR = "#00b4d8";
export const SELECTION_WIDTH = 2.75;
export const HOVER_COLOR = "#0f172a";
export const HOVER_WIDTH = 1.25;

export const FILL_COLOR_EXPRESSION = [
  "step",
  ["to-number", ["get", "siedlungsanteil"]],
  CHOROPLETH_CLASSES[0].color,
  5,
  CHOROPLETH_CLASSES[1].color,
  7.5,
  CHOROPLETH_CLASSES[2].color,
  10,
  CHOROPLETH_CLASSES[3].color,
  12.5,
  CHOROPLETH_CLASSES[4].color,
  15,
  CHOROPLETH_CLASSES[5].color,
  17.5,
  CHOROPLETH_CLASSES[6].color,
  20,
  CHOROPLETH_CLASSES[7].color,
  22.5,
  CHOROPLETH_CLASSES[8].color,
  25,
  CHOROPLETH_CLASSES[9].color,
] as const;

export function formatAnteil(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatEinwohner(value: number): string {
  return value.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

export function formatFlaeche(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
