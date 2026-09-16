import { useEffect, useRef } from "react";
import maplibregl, {
  type DataDrivenPropertyValueSpecification,
  type Map,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import { buildMapFilter } from "../filters";
import { featureFromProps } from "./InfoPanel";
import {
  FILL_COLOR_EXPRESSION,
  FILL_OPACITY,
  HOVER_COLOR,
  HOVER_WIDTH,
  OUTLINE_COLOR,
  OUTLINE_OPACITY,
  OUTLINE_WIDTH,
  SELECTION_COLOR,
  SELECTION_HALO_COLOR,
  SELECTION_HALO_WIDTH,
  SELECTION_WIDTH,
} from "../style";
import type { DatasetKey, FeatureRecord, FilterState } from "../types";
import type { MapCamera } from "../urlState";
import "maplibre-gl/dist/maplibre-gl.css";

let protocolRegistered = false;

function ensureProtocol(): void {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tilev4);
  protocolRegistered = true;
}

function dataUrl(file: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return new URL(`${base}data/${file}`, window.location.href).href;
}

/** OpenFreeMap/Positron bevorzugt name_en – auf Deutsch umbiegen. */
const GERMAN_NAME_EXPR = [
  "coalesce",
  ["get", "name:de"],
  ["get", "name_de"],
  ["get", "name"],
  ["get", "name:latin"],
  ["get", "name_en"],
] as const;

function localizeLabelExpression(expr: unknown): unknown {
  if (!Array.isArray(expr)) return expr;
  if (
    expr.length >= 2 &&
    expr[0] === "get" &&
    (expr[1] === "name_en" || expr[1] === "name:en")
  ) {
    return [...GERMAN_NAME_EXPR];
  }
  return expr.map(localizeLabelExpression);
}

function withGermanLabels(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    layers: style.layers?.map((layer) => {
      if (layer.type !== "symbol" || !layer.layout?.["text-field"]) return layer;
      return {
        ...layer,
        layout: {
          ...layer.layout,
          "text-field": localizeLabelExpression(
            layer.layout["text-field"],
          ) as DataDrivenPropertyValueSpecification<string>,
        },
      };
    }),
  };
}

type Props = {
  dataset: DatasetKey;
  filters: FilterState;
  visible: boolean;
  selected: FeatureRecord[];
  camera: MapCamera | null;
  onCameraChange: (camera: MapCamera) => void;
  onHover: (feature: FeatureRecord | null) => void;
  onSelect: (feature: FeatureRecord, additive: boolean) => void;
  onClearSelection: () => void;
  onOpenMethodology: () => void;
  focusTarget: FeatureRecord | null;
  onFocusHandled: () => void;
};

const CUSTOM_ATTRIBUTION = [
  'Verwaltungsgebiete mit Einwohnerzahlen: © <a href="https://www.bkg.bund.de/" target="_blank" rel="noreferrer">BKG</a> <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noreferrer">dl-de/by-2-0</a> (vgl. <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf" target="_blank" rel="noreferrer">Datenquellen</a>), Stand 31.12.2024',
  'Siedlungsgebiete: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> Mitwirkende, Stand 14.09.2026 (<button type="button" class="linkish" data-methodology>Hinweis zur Methodik</button>)',
  'Hintergrundkarte: <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
].join(" | ");

function clearSourceAttributions(map: Map): void {
  const style = map.getStyle();
  if (!style?.sources) return;
  for (const id of Object.keys(style.sources)) {
    const source = map.getSource(id);
    if (source && "attribution" in source) {
      (source as { attribution?: string }).attribution = undefined;
    }
  }
}

export function MapView({
  dataset,
  filters,
  visible,
  selected,
  camera,
  onCameraChange,
  onHover,
  onSelect,
  onClearSelection,
  onOpenMethodology,
  focusTarget,
  onFocusHandled,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const datasetRef = useRef(dataset);
  const filtersRef = useRef(filters);
  const cameraRef = useRef(camera);
  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  const onClearRef = useRef(onClearSelection);
  const onMethodRef = useRef(onOpenMethodology);
  const onFocusHandledRef = useRef(onFocusHandled);
  const onCameraChangeRef = useRef(onCameraChange);
  datasetRef.current = dataset;
  filtersRef.current = filters;
  cameraRef.current = camera;
  onHoverRef.current = onHover;
  onSelectRef.current = onSelect;
  onClearRef.current = onClearSelection;
  onMethodRef.current = onOpenMethodology;
  onFocusHandledRef.current = onFocusHandled;
  onCameraChangeRef.current = onCameraChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureProtocol();

    const initialCamera = cameraRef.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      ...(initialCamera
        ? {
            center: [initialCamera.lon, initialCamera.lat] as [number, number],
            zoom: initialCamera.z,
          }
        : {
            bounds: [
              [5.8, 47.2],
              [15.1, 55.1],
            ] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: 24 },
          }),
      bearing: 0,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: false,
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.setStyle("https://tiles.openfreemap.org/styles/positron", {
      transformStyle: (_previous, next) => withGermanLabels(next),
    });
    // Quellen-Attributionen entfernen, bevor das Control sie einliest – sonst sortiert MapLibre die Reihenfolge um.
    map.on("sourcedata", () => clearSourceAttributions(map));
    map.on("styledata", () => clearSourceAttributions(map));
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: CUSTOM_ATTRIBUTION,
      }),
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const onAttrClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-methodology]")) {
        event.preventDefault();
        event.stopPropagation();
        onMethodRef.current();
      }
    };
    map.getContainer().addEventListener("click", onAttrClick);

    const emitCamera = () => {
      const center = map.getCenter();
      onCameraChangeRef.current({
        z: map.getZoom(),
        lat: center.lat,
        lon: center.lng,
      });
    };

    map.on("load", () => {
      addDatasetLayers(map, datasetRef.current);
      applyFilter(map, filtersRef.current);
      syncSelectionState(map, selectedIdsRef.current);
      emitCamera();
    });
    map.on("moveend", emitCamera);

    const setHover = (feature: MapGeoJSONFeature | undefined) => {
      const id = feature?.id != null ? String(feature.id) : null;
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
        map.setFeatureState(
          { source: "admin", sourceLayer: "siedlungsdichte", id: hoveredIdRef.current },
          { hover: false },
        );
      }
      hoveredIdRef.current = id;
      if (id !== null) {
        map.setFeatureState(
          { source: "admin", sourceLayer: "siedlungsdichte", id },
          { hover: true },
        );
        map.getCanvas().style.cursor = "pointer";
        onHoverRef.current(featureFromProps(feature?.properties));
      } else {
        map.getCanvas().style.cursor = "";
        onHoverRef.current(null);
      }
    };

    map.on("mousemove", "admin-fill", (event) => {
      setHover(event.features?.[0]);
    });
    map.on("mouseleave", "admin-fill", () => {
      setHover(undefined);
    });
    map.on("click", "admin-fill", (event) => {
      const feature = event.features?.[0];
      const record = featureFromProps(feature?.properties);
      if (!record) return;
      const additive = event.originalEvent.ctrlKey || event.originalEvent.metaKey;
      onSelectRef.current(record, additive);
    });
    map.on("click", (event) => {
      const hits = map.queryRenderedFeatures(event.point, { layers: ["admin-fill"] });
      if (hits.length === 0) onClearRef.current();
    });

    mapRef.current = map;
    return () => {
      map.getContainer().removeEventListener("click", onAttrClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    replaceDataset(map, dataset, filtersRef.current);
    hoveredIdRef.current = null;
    syncSelectionState(map, selectedIdsRef.current);
  }, [dataset]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("admin-fill")) return;
    applyFilter(map, filters);
  }, [filters]);

  useEffect(() => {
    const next = new Set(selected.map((item) => item.regionalschluessel));
    const map = mapRef.current;
    if (map?.getSource("admin")) {
      for (const id of selectedIdsRef.current) {
        if (!next.has(id)) {
          map.setFeatureState(
            { source: "admin", sourceLayer: "siedlungsdichte", id },
            { selected: false },
          );
        }
      }
      for (const id of next) {
        map.setFeatureState(
          { source: "admin", sourceLayer: "siedlungsdichte", id },
          { selected: true },
        );
      }
    }
    selectedIdsRef.current = next;
  }, [selected]);

  useEffect(() => {
    if (visible) mapRef.current?.resize();
  }, [visible]);

  useEffect(() => {
    if (!focusTarget?.bbox || !visible) return;
    const map = mapRef.current;
    if (!map) return;

    const [west, south, east, north] = focusTarget.bbox;
    const run = () => {
      map.resize();
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 64, maxZoom: 12, duration: 800 },
      );
      onFocusHandledRef.current();
    };

    if (map.isStyleLoaded()) run();
    else map.once("load", run);
  }, [focusTarget, visible]);

  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={visible ? "map-wrap" : "map-wrap is-hidden"} aria-hidden={!visible}>
      <div ref={containerRef} className="map-canvas" />
    </div>
  );
}

function pmtilesUrl(dataset: DatasetKey): string {
  return `pmtiles://${dataUrl(`${dataset}.pmtiles`)}`;
}

function firstSymbolLayerId(map: Map): string | undefined {
  return map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
}

function addDatasetLayers(map: Map, dataset: DatasetKey): void {
  if (map.getSource("admin")) return;
  map.addSource("admin", {
    type: "vector",
    url: pmtilesUrl(dataset),
    promoteId: "regionalschluessel",
  });
  const before = firstSymbolLayerId(map);
  map.addLayer(
    {
      id: "admin-fill",
      type: "fill",
      source: "admin",
      "source-layer": "siedlungsdichte",
      paint: {
        "fill-color": FILL_COLOR_EXPRESSION as unknown as string,
        "fill-opacity": FILL_OPACITY,
      },
    },
    before,
  );
  map.addLayer(
    {
      id: "admin-line",
      type: "line",
      source: "admin",
      "source-layer": "siedlungsdichte",
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          HOVER_COLOR,
          OUTLINE_COLOR,
        ],
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.85,
          OUTLINE_OPACITY,
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          HOVER_WIDTH,
          OUTLINE_WIDTH,
        ],
      },
    },
    before,
  );
  map.addLayer(
    {
      id: "admin-select-halo",
      type: "line",
      source: "admin",
      "source-layer": "siedlungsdichte",
      paint: {
        "line-color": SELECTION_HALO_COLOR,
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.95,
          0,
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          SELECTION_HALO_WIDTH,
          0,
        ],
      },
    },
    before,
  );
  map.addLayer(
    {
      id: "admin-select",
      type: "line",
      source: "admin",
      "source-layer": "siedlungsdichte",
      paint: {
        "line-color": SELECTION_COLOR,
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          1,
          0,
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          SELECTION_WIDTH,
          0,
        ],
      },
    },
    before,
  );
}

const ADMIN_LAYERS = ["admin-select", "admin-select-halo", "admin-line", "admin-fill"] as const;

function replaceDataset(map: Map, dataset: DatasetKey, filters: FilterState): void {
  for (const id of ADMIN_LAYERS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource("admin")) map.removeSource("admin");
  addDatasetLayers(map, dataset);
  applyFilter(map, filters);
}

function applyFilter(map: Map, filters: FilterState): void {
  const expr = buildMapFilter(filters);
  for (const id of ADMIN_LAYERS) {
    if (map.getLayer(id)) map.setFilter(id, expr);
  }
}

function syncSelectionState(map: Map, ids: Set<string>): void {
  for (const id of ids) {
    map.setFeatureState(
      { source: "admin", sourceLayer: "siedlungsdichte", id },
      { selected: true },
    );
  }
}
