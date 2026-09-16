import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { describeActiveFilters } from "./filters";
import { formatAnteil, formatEinwohner, formatFlaeche } from "./style";
import type { DatasetKey, FeatureRecord, FilterState } from "./types";

const COLUMNS = [
  "Name",
  "Bezeichnung",
  "Bemerkung",
  "Bundesland",
  "Regionalschlüssel",
  "Siedlungsgebietsanteil",
  "Einwohnerzahl",
  "Fläche (km²)",
] as const;

function rows(records: FeatureRecord[]): string[][] {
  return records.map((r) => [
    r.name,
    r.bezeichnung,
    r.bemerkung,
    r.bundesland,
    r.regionalschluessel,
    `${formatAnteil(r.siedlungsanteil)} %`,
    formatEinwohner(r.einwohnerzahl),
    formatFlaeche(r.flaeche),
  ]);
}

export function exportCsv(records: FeatureRecord[], dataset: DatasetKey): void {
  const header = COLUMNS.join(";");
  const body = rows(records)
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], {
    type: "text/csv;charset=utf-8",
  });
  download(blob, `siedlungsdichte-${dataset}.csv`);
}

export function exportPdf(
  records: FeatureRecord[],
  dataset: DatasetKey,
  filters: FilterState,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxTextWidth = pageWidth - 28;
  const title =
    dataset === "gemeinden"
      ? "Siedlungsdichte der Gemeinden"
      : "Siedlungsdichte der Verwaltungsgemeinschaften";
  const filterNote = describeActiveFilters(filters);

  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`${records.length.toLocaleString("de-DE")} Einträge`, 14, 20);
  doc.setFontSize(8);
  const filterLines = doc.splitTextToSize(filterNote, maxTextWidth);
  doc.text(filterLines, 14, 25);
  const tableTop = 25 + filterLines.length * 4 + 2;

  autoTable(doc, {
    startY: tableTop,
    head: [COLUMNS as unknown as string[]],
    body: rows(records),
    styles: { fontSize: 6.5, cellPadding: 1.0 },
    headStyles: { fillColor: [27, 18, 51], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 242, 236] },
  });
  doc.save(`siedlungsdichte-${dataset}.pdf`);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
