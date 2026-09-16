#!/usr/bin/env python3
"""GPKG → einheitliches Schema, GeoJSON, JSON und PMTiles für die Web-App."""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

from osgeo import ogr, osr

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "web" / "public" / "data"

LKZ_TO_NAME = {
    "BB": "Brandenburg",
    "BE": "Berlin",
    "BW": "Baden-Württemberg",
    "BY": "Bayern",
    "HB": "Bremen",
    "HE": "Hessen",
    "HH": "Hamburg",
    "MV": "Mecklenburg-Vorpommern",
    "NI": "Niedersachsen",
    "NW": "Nordrhein-Westfalen",
    "RP": "Rheinland-Pfalz",
    "SH": "Schleswig-Holstein",
    "SL": "Saarland",
    "SN": "Sachsen",
    "ST": "Sachsen-Anhalt",
    "TH": "Thüringen",
}

# Einheitliches Schema in beiden GPKGs (VG250 + EWZ).
COMMON_FIELDS = {
    "name": "GEN",
    "bezeichnung": "BEZ",
    "bemerkung": "BEM",
    "lkz": "LKZ",
    "regionalschluessel": "ARS",
    "siedlungsanteil": "Siedlungsgebiete_pc",
    "einwohnerzahl": "EWZ",
    "flaeche_m2": "Flaeche",
}

DATASETS = [
    {
        "key": "gemeinden",
        "gpkg": ROOT / "data" / "siedlungsdichte_gemeinden_mit_ew.gpkg",
        "layer": "siedlungsdichte_gemeinden_mit_ew_20241231",
        "fields": COMMON_FIELDS,
    },
    {
        "key": "verwaltungsgemeinschaften",
        "gpkg": ROOT / "data" / "siedlungsdichte_verwaltungsgemeinschaften_mit_ew.gpkg",
        "layer": "siedlungsdichte_verwaltungsgemeinschaften_mit_ew",
        "fields": COMMON_FIELDS,
    },
]


def round1(value: float | None) -> float | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), 1)


def round2(value: float | None) -> float | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), 2)


def as_int(value) -> int | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return int(value)


def transform_layer(spec: dict) -> tuple[int, Path, Path]:
    src_path = spec["gpkg"]
    if not src_path.exists():
        raise FileNotFoundError(f"Quelldatei fehlt: {src_path}")

    src_ds = ogr.Open(str(src_path))
    if src_ds is None:
        raise RuntimeError(f"Konnte {src_path} nicht öffnen")
    src_layer = src_ds.GetLayerByName(spec["layer"])
    if src_layer is None:
        raise RuntimeError(f"Layer {spec['layer']} nicht gefunden")

    src_srs = src_layer.GetSpatialRef()
    dst_srs = osr.SpatialReference()
    dst_srs.ImportFromEPSG(4326)
    dst_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    transform = osr.CoordinateTransformation(src_srs, dst_srs)

    geojson_path = OUT_DIR / f"{spec['key']}.geojson"
    json_path = OUT_DIR / f"{spec['key']}.json"

    features = []
    records = []
    fields = spec["fields"]

    src_layer.ResetReading()
    for feature in src_layer:
        geom = feature.GetGeometryRef()
        if geom is None or geom.IsEmpty():
            continue
        geom = geom.Clone()
        geom.Transform(transform)
        env = geom.GetEnvelope()  # minX, maxX, minY, maxY
        bbox = [
            round(env[0], 6),
            round(env[2], 6),
            round(env[1], 6),
            round(env[3], 6),
        ]

        lkz = feature.GetField(fields["lkz"]) or ""
        flaeche_m2 = feature.GetField(fields["flaeche_m2"])
        flaeche_km2 = (
            round2(float(flaeche_m2) / 1_000_000.0) if flaeche_m2 is not None else None
        )
        record = {
            "name": feature.GetField(fields["name"]) or "",
            "bezeichnung": feature.GetField(fields["bezeichnung"]) or "",
            "bemerkung": feature.GetField(fields["bemerkung"]) or "",
            "bundesland": LKZ_TO_NAME.get(lkz, lkz),
            "regionalschluessel": str(feature.GetField(fields["regionalschluessel"]) or ""),
            "siedlungsanteil": round1(feature.GetField(fields["siedlungsanteil"])),
            "einwohnerzahl": as_int(feature.GetField(fields["einwohnerzahl"])),
            "flaeche": flaeche_km2,
            "bbox": bbox,
        }
        if record["siedlungsanteil"] is None:
            continue
        if record["einwohnerzahl"] is None or record["flaeche"] is None:
            continue
        records.append(record)
        tile_props = {k: v for k, v in record.items() if k != "bbox"}
        features.append(
            {
                "type": "Feature",
                "properties": tile_props,
                "geometry": json.loads(geom.ExportToJson()),
            }
        )

    src_ds = None

    records.sort(key=lambda r: (-(r["siedlungsanteil"] or 0), r["name"]))
    geojson_path.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    json_path.write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return len(records), geojson_path, json_path


def geojson_to_pmtiles(geojson_path: Path, pmtiles_path: Path) -> None:
    if pmtiles_path.exists():
        pmtiles_path.unlink()
    cmd = [
        "ogr2ogr",
        "-f",
        "PMTiles",
        str(pmtiles_path),
        str(geojson_path),
        "-nln",
        "siedlungsdichte",
        "-dsco",
        "MINZOOM=4",
        "-dsco",
        "MAXZOOM=12",
        "-dsco",
        "MAX_SIZE=5000000",
        "-dsco",
        "MAX_FEATURES=200000",
        "-dsco",
        "SIMPLIFICATION=4",
        "-dsco",
        "NAME=siedlungsdichte",
        "-lco",
        "NAME=siedlungsdichte",
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    ogr.UseExceptions()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in DATASETS:
        count, geojson_path, json_path = transform_layer(spec)
        pmtiles_path = OUT_DIR / f"{spec['key']}.pmtiles"
        print(f"{spec['key']}: {count} Flächen → {json_path.name}, {geojson_path.name}")
        geojson_to_pmtiles(geojson_path, pmtiles_path)
        print(f"  PMTiles: {pmtiles_path.name} ({pmtiles_path.stat().st_size / 1024 / 1024:.1f} MB)")
        geojson_path.unlink()
    return 0


if __name__ == "__main__":
    sys.exit(main())
