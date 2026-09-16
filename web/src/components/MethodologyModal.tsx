import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const TAG_GROUPS: { key: string; values: string[] }[] = [
  {
    key: "landuse",
    values: [
      "residential",
      "commercial",
      "industrial",
      "retail",
      "education",
      "religious",
      "garages",
      "brownfield",
      "construction",
    ],
  },
  {
    key: "leisure",
    values: ["park", "garden", "dog_park", "sports_centre", "stadium"],
  },
  {
    key: "amenity",
    values: [
      "school",
      "kindergarten",
      "college",
      "university",
      "hospital",
      "clinic",
      "prison",
    ],
  },
];

export function MethodologyModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="methodology-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="methodology-title">Hinweis zur Methodik</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p>
            Die Karte stellt die <strong>Siedlungsdichte</strong> deutscher Verwaltungsgebiete dar:
            den Flächenanteil der als Siedlungsgebiet eingestuften Flächen an der Gesamtfläche der
            jeweiligen Gemeinde bzw. Verwaltungsgemeinschaft.
          </p>
          <p>
            Als Siedlungsgebiet gelten Flächen aus OpenStreetMap, die mit mindestens einem der
            folgenden Tags versehen sind (nur Flächenobjekte):
          </p>
          <ul className="tag-list">
            {TAG_GROUPS.map((group) => (
              <li key={group.key}>
                <code>{group.key}</code>
                {" = "}
                {group.values.map((value, index) => (
                  <span key={value}>
                    {index > 0 ? ", " : null}
                    <code>{value}</code>
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p>
            Der Siedlungsgebietsanteil ergibt sich aus der Schnittmenge dieser OSM-Flächen mit dem
            jeweiligen Verwaltungsgebiet, bezogen auf dessen Gesamtfläche.
          </p>
        </div>
      </div>
    </div>
  );
}
