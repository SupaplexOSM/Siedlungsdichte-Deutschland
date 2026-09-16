import { formatAnteil, formatEinwohner, formatFlaeche } from "../style";
import type { FeatureRecord } from "../types";

type Props = {
  hovered: FeatureRecord | null;
  selected: FeatureRecord[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onClearSelection: () => void;
};

export function InfoPanel({
  hovered,
  selected,
  selectedIndex,
  onSelectedIndexChange,
  onClearSelection,
}: Props) {
  const hasSelection = selected.length > 0;
  const active = hasSelection
    ? selected[Math.min(selectedIndex, selected.length - 1)] ?? null
    : hovered;

  return (
    <div className="info-panel" aria-live="polite">
      {hasSelection && (
        <div className="info-panel-head">
          <div className="info-panel-nav">
            {selected.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Vorherige Auswahl"
                  disabled={selectedIndex <= 0}
                  onClick={() => onSelectedIndexChange(selectedIndex - 1)}
                >
                  ‹
                </button>
                <span className="info-panel-count">
                  {selectedIndex + 1} / {selected.length}
                </span>
                <button
                  type="button"
                  aria-label="Nächste Auswahl"
                  disabled={selectedIndex >= selected.length - 1}
                  onClick={() => onSelectedIndexChange(selectedIndex + 1)}
                >
                  ›
                </button>
              </>
            )}
            <button type="button" className="info-panel-clear" onClick={onClearSelection}>
              Auswahl aufheben
            </button>
          </div>
        </div>
      )}

      {active ? (
        <dl className="info-grid">
          <dt>Name</dt>
          <dd>{active.name}</dd>
          <dt>Bezeichnung</dt>
          <dd>{active.bezeichnung}</dd>
          <dt>Bemerkung</dt>
          <dd>{active.bemerkung}</dd>
          <dt>Bundesland</dt>
          <dd>{active.bundesland}</dd>
          <dt>Regionalschlüssel</dt>
          <dd className="mono">{active.regionalschluessel}</dd>
          <dt>Siedlungsgebietsanteil</dt>
          <dd>{formatAnteil(active.siedlungsanteil)}&nbsp;%</dd>
          <dt>Einwohnerzahl</dt>
          <dd>{formatEinwohner(active.einwohnerzahl)}</dd>
          <dt>Fläche</dt>
          <dd>{formatFlaeche(active.flaeche)}&nbsp;km²</dd>
        </dl>
      ) : (
        <p className="info-panel-hint">
          Fläche anklicken zum Auswählen. Strg- bzw. Cmd+Klick für Mehrfachauswahl. Mit der Maus
          darüberfahren zeigt eine Vorschau.
        </p>
      )}
    </div>
  );
}

export function featureFromProps(props: Record<string, unknown> | null | undefined): FeatureRecord | null {
  if (!props) return null;
  const anteil = Number(props.siedlungsanteil);
  const einwohnerzahl = Number(props.einwohnerzahl);
  const flaeche = Number(props.flaeche);
  if (
    !props.regionalschluessel ||
    Number.isNaN(anteil) ||
    Number.isNaN(einwohnerzahl) ||
    Number.isNaN(flaeche)
  ) {
    return null;
  }
  return {
    name: String(props.name ?? ""),
    bezeichnung: String(props.bezeichnung ?? ""),
    bemerkung: String(props.bemerkung ?? ""),
    bundesland: String(props.bundesland ?? ""),
    regionalschluessel: String(props.regionalschluessel),
    siedlungsanteil: anteil,
    einwohnerzahl,
    flaeche,
  };
}
