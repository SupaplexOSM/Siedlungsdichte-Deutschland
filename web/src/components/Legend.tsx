import { CHOROPLETH_CLASSES } from "../style";

/** Innere Klassengrenzen (ohne 0 und ohne offenes Ende). */
const INNER_BREAKS = CHOROPLETH_CLASSES.map((c) => c.max).filter((n) =>
  Number.isFinite(n),
);

function formatBreak(value: number): string {
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
}

export function Legend() {
  const segmentCount = CHOROPLETH_CLASSES.length;

  return (
    <div className="legend" aria-label="Legende Siedlungsgebietsanteil">
      <span className="filter-label">Siedlungsgebietsanteil (%)</span>
      <div className="legend-bar-wrap">
        <div
          className="legend-bar"
          role="img"
          aria-label={CHOROPLETH_CLASSES.map((c) => c.label).join(", ")}
        >
          {CHOROPLETH_CLASSES.map((item) => (
            <span
              key={item.label}
              className="legend-segment"
              style={{ background: item.color }}
              title={item.label}
            />
          ))}
        </div>
        <div className="legend-ticks">
          <span className="is-start" style={{ left: "0%" }}>
            &lt;
          </span>
          {INNER_BREAKS.map((value, index) => (
            <span
              key={String(value)}
              style={{ left: `${((index + 1) / segmentCount) * 100}%` }}
            >
              {formatBreak(value)}
            </span>
          ))}
          <span className="is-end" style={{ left: "100%" }}>
            ≥
          </span>
        </div>
      </div>
    </div>
  );
}
