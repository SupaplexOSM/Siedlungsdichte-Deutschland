# Siedlungsdichte Deutschland

Interaktive Webkarte zum **Siedlungsgebietsanteil** deutscher Verwaltungsgebiete: dem Flächenanteil der als Siedlungsgebiet eingestuften Flächen an der Gesamtfläche der jeweiligen Gemeinde bzw. Verwaltungsgemeinschaft.

Die Anwendung bietet Karten- und Listenansicht, Filter (u. a. Bundesland, Bezeichnung, Siedlungsanteil, Einwohnerzahl, Fläche), Mehrfachauswahl, Export und Deep Links über die Browser-URL.

## Datengrundlage und Methodik

Der angezeigte Anteil ergibt sich aus der **Schnittmenge** der Siedlungsflächen mit dem jeweiligen Verwaltungsgebiet, bezogen auf dessen Gesamtfläche.

Die **Datenaufbereitung** (OSM filtern, Verschneidung mit Verwaltungsgebieten, Anreichern mit Einwohnerzahlen) ist derzeit **nicht Teil dieses Repos**. Die Web-App arbeitet mit den daraus erzeugten, vorbereiteten Dateien unter `web/public/data/` (JSON/PMTiles), die sich lokal mit [`scripts/prepare-web-data.py`](scripts/prepare-web-data.py) erzeugen lassen, sofern GPKGs mit Verwaltungsgebieten und Siedlungsgebietsanteilen vorliegen.

### Verwaltungsgebiete und Einwohnerzahlen

Geometrie und Attribute der Gemeinden bzw. Verwaltungsgemeinschaften sowie Einwohnerzahlen stammen aus den [Verwaltungsgebieten des BKG](https://gdz.bkg.bund.de/index.php/default/digitale-geodaten/verwaltungsgebiete.html) (Produktlinie VG250 mit Einwohnerzahlen, Lizenz [dl-de/by-2-0](https://www.govdata.de/dl-de/by-2-0)). Aktueller Stand in der Karte: **31.12.2024**.

### Siedlungsgebiete (OpenStreetMap)

Als Siedlungsgebiet gelten **Flächenobjekte** aus OpenStreetMap (Deutschland-Extrakt z. B. von [Geofabrik](https://download.geofabrik.de/europe/germany.html)), die mit mindestens einem der folgenden Tags versehen sind:

| Schlüssel | Werte |
|-----------|--------|
| `landuse` | `residential`, `commercial`, `industrial`, `retail`, `education`, `religious`, `garages`, `brownfield`, `construction` |
| `leisure` | `park`, `garden`, `dog_park`, `sports_centre`, `stadium` |
| `amenity` | `school`, `kindergarten`, `college`, `university`, `hospital`, `clinic`, `prison` |

Stand der OSM-Auswertung in der Karte: **14.09.2026**. Dieselbe Erläuterung ist in der App unter „Hinweis zur Methodik“ verlinkt.

### Hintergrundkarte

Darstellung über [OpenFreeMap](https://openfreemap.org) / [OpenMapTiles](https://www.openmaptiles.org/) auf Basis von OpenStreetMap.

## Lokal starten

Voraussetzungen: **Node.js 22** und die vorbereiteten Kartendaten unter `web/public/data/`.

```bash
cd web
npm install
npm run dev
```

Die App läuft unter `http://localhost:5173`.

Optional – Kartendaten neu erzeugen (Python 3 mit GDAL, lokale Eingangs-GPKGs vorausgesetzt):

```bash
python3 scripts/prepare-web-data.py
```

## Veröffentlichung (GitHub Pages)

1. Repository auf GitHub anlegen und pushen (inkl. der Dateien unter `web/public/data/`).
2. Unter **Settings → Pages → Source** „GitHub Actions“ wählen.
3. Der Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) baut die App und veröffentlicht `web/dist`.
