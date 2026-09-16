import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { exportCsv, exportPdf } from "../export";
import { formatAnteil, formatEinwohner, formatFlaeche } from "../style";
import type { DatasetKey, FeatureRecord, FilterState, SortKey } from "../types";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "name", label: "Name" },
  { key: "bezeichnung", label: "Bezeichnung" },
  { key: "bemerkung", label: "Bemerkung" },
  { key: "bundesland", label: "Bundesland" },
  { key: "regionalschluessel", label: "Regionalschlüssel" },
  { key: "siedlungsanteil", label: "Siedlungsgebietsanteil", align: "right" },
  { key: "einwohnerzahl", label: "Einwohnerzahl", align: "right" },
  { key: "flaeche", label: "Fläche (km²)", align: "right" },
];

type Props = {
  records: FeatureRecord[];
  dataset: DatasetKey;
  filters: FilterState;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onShowOnMap: (record: FeatureRecord) => void;
  visible: boolean;
};

export function ListView({
  records,
  dataset,
  filters,
  sortKey,
  sortDir,
  onSort,
  onShowOnMap,
  visible,
}: Props) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 16,
  });

  useEffect(() => {
    if (visible) virtualizer.measure();
  }, [visible, virtualizer, records.length]);

  return (
    <div className={visible ? "list-wrap" : "list-wrap is-hidden"}>
      <div className="list-toolbar">
        <span>{records.length.toLocaleString("de-DE")} Einträge</span>
        <div className="list-actions">
          <button type="button" onClick={() => exportCsv(records, dataset)}>
            CSV exportieren
          </button>
          <button type="button" onClick={() => exportPdf(records, dataset, filters)}>
            PDF exportieren
          </button>
        </div>
      </div>
      <div className="table-scroll" ref={parentRef}>
        <div className="table-head">
          <span className="th th-map" aria-hidden="true" />
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              className={`th ${col.align === "right" ? "is-right" : ""} ${sortKey === col.key ? "is-active" : ""}`}
              onClick={() => onSort(col.key)}
            >
              {col.label}
              {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          ))}
        </div>
        <div className="table-body" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = records[item.index];
            return (
              <div
                key={row.regionalschluessel}
                className="tr"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <div className="td-map">
                  <button
                    type="button"
                    className="map-jump"
                    title="Auf Karte anzeigen"
                    aria-label={`${row.name} auf Karte anzeigen`}
                    onClick={() => onShowOnMap(row)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2-6-2z" strokeLinejoin="round" />
                      <path d="M9 4v14M15 6v14" />
                    </svg>
                  </button>
                </div>
                <div title={row.name}>{row.name}</div>
                <div>{row.bezeichnung}</div>
                <div>{row.bemerkung}</div>
                <div>{row.bundesland}</div>
                <div className="mono">{row.regionalschluessel}</div>
                <div className="is-right">{formatAnteil(row.siedlungsanteil)} %</div>
                <div className="is-right">{formatEinwohner(row.einwohnerzahl)}</div>
                <div className="is-right">{formatFlaeche(row.flaeche)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
