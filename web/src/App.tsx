import { useEffect, useMemo, useRef, useState } from "react";
import { Filters } from "./components/Filters";
import { InfoPanel } from "./components/InfoPanel";
import { Legend } from "./components/Legend";
import { ListView } from "./components/ListView";
import { MapView } from "./components/MapView";
import { MethodologyModal } from "./components/MethodologyModal";
import { hasActiveFilters, matchesFilters, sortRecords, uniqueSorted } from "./filters";
import type { DatasetKey, FeatureRecord, FilterState, SortKey, ViewMode } from "./types";
import {
  buildSearchParams,
  camerasEqual,
  createDefaultFilters,
  type MapCamera,
  parseUrlState,
  replaceUrlSearch,
} from "./urlState";

const DATASET_FILES: Record<DatasetKey, string> = {
  gemeinden: "data/gemeinden.json",
  verwaltungsgemeinschaften: "data/verwaltungsgemeinschaften.json",
};

function initialFromUrl() {
  return parseUrlState(window.location.search);
}

export function App() {
  const initial = useMemo(() => initialFromUrl(), []);
  const pendingSelectedIds = useRef<string[] | null>(initial.selectedIds ?? null);

  const [dataset, setDataset] = useState<DatasetKey>(initial.dataset ?? "gemeinden");
  const [view, setView] = useState<ViewMode>(initial.view ?? "map");
  const [filters, setFilters] = useState<FilterState>(
    initial.filters ?? createDefaultFilters(),
  );
  const [searchInput, setSearchInput] = useState(initial.filters?.search ?? "");
  const [records, setRecords] = useState<FeatureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(initial.sortKey ?? "siedlungsanteil");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initial.sortDir ?? "desc");
  const [hovered, setHovered] = useState<FeatureRecord | null>(null);
  const [selected, setSelected] = useState<FeatureRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(initial.selectedIndex ?? 0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<FeatureRecord | null>(null);
  const [mapCamera, setMapCamera] = useState<MapCamera | null>(initial.camera ?? null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`${import.meta.env.BASE_URL}${DATASET_FILES[dataset]}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Daten nicht gefunden (${res.status})`);
        return res.json() as Promise<FeatureRecord[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setRecords(data);
        const pending = pendingSelectedIds.current;
        if (pending && pending.length > 0) {
          const byId = new Map(data.map((r) => [r.regionalschluessel, r]));
          const resolved = pending
            .map((id) => byId.get(id))
            .filter((r): r is FeatureRecord => Boolean(r));
          setSelected(resolved);
          setSelectedIndex((idx) =>
            resolved.length === 0 ? 0 : Math.min(idx, resolved.length - 1),
          );
          pendingSelectedIds.current = null;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
      });
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = buildSearchParams({
        dataset,
        view,
        camera: mapCamera,
        selectedIds: selected.map((r) => r.regionalschluessel),
        selectedIndex,
        filters,
        sortKey,
        sortDir,
      });
      replaceUrlSearch(search);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [dataset, view, mapCamera, selected, selectedIndex, filters, sortKey, sortDir]);

  const options = useMemo(
    () => ({
      bundeslaender: uniqueSorted(records.map((r) => r.bundesland)),
      bezeichnungen: uniqueSorted(records.map((r) => r.bezeichnung)),
      bemerkungen: uniqueSorted(records.map((r) => r.bemerkung)),
    }),
    [records],
  );

  const visibleRecords = useMemo(
    () => sortRecords(records.filter((r) => matchesFilters(r, filters)), sortKey, sortDir),
    [records, filters, sortKey, sortDir],
  );

  const clearSelection = () => {
    setSelected([]);
    setSelectedIndex(0);
  };

  const switchDataset = (next: DatasetKey) => {
    setDataset(next);
    setFilters((prev) => ({
      ...prev,
      bezeichnungen: [],
      bemerkungen: [],
    }));
    setSortKey("siedlungsanteil");
    setSortDir("desc");
    setHovered(null);
    clearSelection();
    pendingSelectedIds.current = null;
  };

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "siedlungsanteil" ? "desc" : "asc");
    }
  };

  const onSelect = (feature: FeatureRecord, additive: boolean) => {
    setSelected((prev) => {
      if (additive) {
        const exists = prev.findIndex((item) => item.regionalschluessel === feature.regionalschluessel);
        if (exists >= 0) {
          const next = prev.filter((_, i) => i !== exists);
          setSelectedIndex((idx) => Math.max(0, Math.min(idx, next.length - 1)));
          return next;
        }
        setSelectedIndex(prev.length);
        return [...prev, feature];
      }
      setSelectedIndex(0);
      return [feature];
    });
  };

  const onShowOnMap = (record: FeatureRecord) => {
    setSelected([record]);
    setSelectedIndex(0);
    setHovered(null);
    setSidebarOpen(false);
    setView("map");
    setFocusTarget(record);
  };

  const onCameraChange = (camera: MapCamera) => {
    setMapCamera((prev) => (camerasEqual(prev, camera) ? prev : camera));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>Siedlungsdichte Deutschland</h1>
          <p>Anteil von Siedlungsgebieten an der Gesamtfläche der Verwaltungsgebiete</p>
        </div>
        <div className="header-controls">
          <button
            type="button"
            className="sidebar-toggle"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? "Seitenleiste schließen" : "Filter & Infos"}
          </button>
          <div className="control-group">
            <span className="control-group-label">Ebene</span>
            <div className="segmented" role="group" aria-label="Verwaltungsebene">
              <button
                type="button"
                className={dataset === "gemeinden" ? "is-active" : ""}
                onClick={() => switchDataset("gemeinden")}
              >
                Gemeinden
              </button>
              <button
                type="button"
                className={dataset === "verwaltungsgemeinschaften" ? "is-active" : ""}
                onClick={() => switchDataset("verwaltungsgemeinschaften")}
              >
                Verwaltungsgemeinschaften
              </button>
            </div>
          </div>
          <div className="control-group">
            <span className="control-group-label">Ansicht</span>
            <div className="segmented" role="group" aria-label="Ansicht">
              <button
                type="button"
                className={view === "map" ? "is-active" : ""}
                onClick={() => setView("map")}
              >
                Karte
              </button>
              <button
                type="button"
                className={view === "list" ? "is-active" : ""}
                onClick={() => setView("list")}
              >
                Liste
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="body">
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Seitenleiste schließen"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`} aria-label="Seitenleiste">
          <div className="sidebar-section">
            <h2 className="sidebar-title">Legende</h2>
            <Legend />
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title-row">
              <h2 className="sidebar-title">Filter</h2>
              {hasActiveFilters(filters, searchInput) && (
                <button
                  type="button"
                  className="filter-reset-all"
                  title="Alle Filter zurücksetzen"
                  onClick={() => {
                    setSearchInput("");
                    setFilters(createDefaultFilters());
                  }}
                >
                  Alle zurücksetzen
                </button>
              )}
            </div>
            <Filters
              filters={filters}
              searchInput={searchInput}
              onSearchInputChange={(value) => {
                setSearchInput(value);
                if (value === "") {
                  setFilters((prev) => (prev.search === "" ? prev : { ...prev, search: "" }));
                }
              }}
              bundeslaender={options.bundeslaender}
              bezeichnungen={options.bezeichnungen}
              bemerkungen={options.bemerkungen}
              onChange={setFilters}
            />
          </div>
          <div className="sidebar-section">
            <h2 className="sidebar-title">Attribute</h2>
            <InfoPanel
              hovered={hovered}
              selected={selected}
              selectedIndex={selectedIndex}
              onSelectedIndexChange={setSelectedIndex}
              onClearSelection={clearSelection}
            />
          </div>
        </aside>

        <main className="main">
          {error && <p className="error">{error}</p>}
          <MapView
            dataset={dataset}
            filters={filters}
            visible={view === "map"}
            selected={selected}
            camera={mapCamera}
            onCameraChange={onCameraChange}
            onHover={setHovered}
            onSelect={onSelect}
            onClearSelection={clearSelection}
            onOpenMethodology={() => setMethodologyOpen(true)}
            focusTarget={focusTarget}
            onFocusHandled={() => setFocusTarget(null)}
          />
          <ListView
            records={visibleRecords}
            dataset={dataset}
            filters={filters}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onShowOnMap={onShowOnMap}
            visible={view === "list"}
          />
        </main>
      </div>

      <MethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
    </div>
  );
}
