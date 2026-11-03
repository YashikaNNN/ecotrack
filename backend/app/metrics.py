"""Read evaluation CSVs written by the project's test script.

Those files are optional. When they are absent, the API says so.
It does not invent precision, recall, F1, mAP, or accuracy.
"""

from __future__ import annotations

import csv
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def data_dir() -> Path:
    raw = os.getenv("ECOTRACK_DATA")
    if raw:
        path = Path(raw)
        return path if path.is_absolute() else ROOT / path
    return ROOT / "data"


def _metrics_path() -> Path:
    return data_dir() / "test_metrics.csv"


def _confusion_path() -> Path:
    return data_dir() / "test_confusion_counts.csv"


def _number(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if text == "":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _find(fieldnames: list[str], *candidates: str) -> str | None:
    lookup = {name.strip().lower(): name for name in fieldnames}
    for candidate in candidates:
        found = lookup.get(candidate.lower())
        if found:
            return found
    return None


def _load_metrics(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            return []
        fields = list(reader.fieldnames)
        class_key = _find(fields, "Class", "class")
        if class_key is None:
            return []
        columns = {
            "precision": _find(fields, "Precision"),
            "recall": _find(fields, "Recall"),
            "f1": _find(fields, "F1", "F1-score"),
            "map50": _find(fields, "mAP50", "mAP@50"),
            "map50_95": _find(fields, "mAP50-95", "mAP@50-95"),
            "test_images": _find(fields, "Test images", "Test image"),
            "top1": _find(fields, "Top-1 acc", "Top-1 accuracy", "Top1"),
        }
        rows = []
        for record in reader:
            class_name = (record.get(class_key) or "").strip()
            if not class_name:
                continue
            parsed = {"class_name": class_name}
            for key, column in columns.items():
                parsed[key] = _number(record.get(column)) if column else None
            rows.append(parsed)
        return rows


def _load_confusion(path: Path) -> dict | None:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader, None)
        if not header or len(header) < 2:
            return None
        labels = [cell.removeprefix("pred_").strip() for cell in header[1:]]
        matrix: list[list[float]] = []
        row_labels: list[str] = []
        for record in reader:
            if not record:
                continue
            row_labels.append(record[0].removeprefix("true_").strip())
            matrix.append([_number(cell) or 0 for cell in record[1:]])
        if not matrix:
            return None
        return {"row_labels": row_labels, "column_labels": labels, "matrix": matrix}


def evaluation_payload() -> dict:
    metrics_file = _metrics_path()
    confusion_file = _confusion_path()
    if not metrics_file.is_file():
        return {
            "available": False,
            "message": (
                "test_metrics.csv has not been added. The Phase 2 report left "
                "measured scores pending, so EcoTrack does not show precision, "
                "recall, F1, mAP, or accuracy figures."
            ),
            "rows": [],
            "confusion": None,
            "source": None,
        }

    rows = _load_metrics(metrics_file)
    confusion = _load_confusion(confusion_file) if confusion_file.is_file() else None
    if not rows:
        return {
            "available": False,
            "message": "test_metrics.csv is present but has no readable class rows.",
            "rows": [],
            "confusion": confusion,
            "source": "backend/data/test_metrics.csv",
        }

    return {
        "available": True,
        "message": (
            "Scores are read from the evaluation CSV. EcoTrack does not recompute them. "
            "Because each training label is one box covering most of the photo, "
            "mAP describes that labelling scheme. Top-1 accuracy is the clearer class measure."
        ),
        "rows": rows,
        "confusion": confusion,
        "source": "backend/data/test_metrics.csv",
    }
