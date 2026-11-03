"""SQLite storage for scan history, points, and simulated bin counts."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

from app.rules import RULES, capacity

ROOT = Path(__file__).resolve().parents[1]
_LOCK = threading.Lock()


def database_file() -> Path:
    raw = os.getenv("ECOTRACK_DB")
    if raw:
        path = Path(raw)
        return path if path.is_absolute() else ROOT / path
    return ROOT / "data" / "ecotrack.db"


def connect() -> sqlite3.Connection:
    path = database_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _LOCK:
        conn = connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    display_name TEXT NOT NULL,
                    canonical TEXT,
                    class_name TEXT,
                    label TEXT,
                    confidence REAL,
                    bin_name TEXT,
                    points INTEGER NOT NULL DEFAULT 0,
                    accepted INTEGER NOT NULL,
                    reason TEXT,
                    box_json TEXT,
                    image_width INTEGER,
                    image_height INTEGER,
                    extra_boxes INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()


def insert_scan(
    *,
    display_name: str,
    canonical: str | None,
    class_name: str | None,
    label: str | None,
    confidence: float | None,
    bin_name: str | None,
    points: int,
    accepted: bool,
    reason: str | None,
    box: list[float] | None,
    image_width: int,
    image_height: int,
    extra_boxes: int,
) -> int:
    created = datetime.now(timezone.utc).isoformat()
    with _LOCK:
        conn = connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO scans (
                    display_name, canonical, class_name, label, confidence,
                    bin_name, points, accepted, reason, box_json,
                    image_width, image_height, extra_boxes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    display_name,
                    canonical,
                    class_name,
                    label,
                    confidence,
                    bin_name,
                    points,
                    1 if accepted else 0,
                    reason,
                    json.dumps(box) if box is not None else None,
                    image_width,
                    image_height,
                    extra_boxes,
                    created,
                ),
            )
            conn.commit()
            return int(cursor.lastrowid)
        finally:
            conn.close()


def _public_row(row: sqlite3.Row) -> dict:
    item = dict(row)
    raw_box = item.pop("box_json")
    item["box"] = json.loads(raw_box) if raw_box else None
    item["accepted"] = bool(item["accepted"])
    return item


def list_scans(display_name: str, limit: int = 50) -> list[dict]:
    limit = max(1, min(limit, 100))
    with _LOCK:
        conn = connect()
        try:
            rows = conn.execute(
                """
                SELECT * FROM scans
                WHERE display_name = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (display_name, limit),
            ).fetchall()
        finally:
            conn.close()
    return [_public_row(row) for row in rows]


def _scope(display_name: str | None) -> tuple[str, list[str]]:
    if display_name:
        return "WHERE display_name = ?", [display_name]
    return "", []


def stats(display_name: str | None) -> dict:
    clause, args = _scope(display_name)
    with _LOCK:
        conn = connect()
        try:
            totals = conn.execute(
                f"""
                SELECT
                    COUNT(*) AS scans_total,
                    COALESCE(SUM(accepted), 0) AS accepted,
                    COALESCE(SUM(points), 0) AS points
                FROM scans
                {clause}
                """,
                args,
            ).fetchone()
            grouped = conn.execute(
                f"""
                SELECT canonical, COUNT(*) AS n
                FROM scans
                {clause + (" AND " if clause else "WHERE ")} accepted = 1
                GROUP BY canonical
                """,
                args,
            ).fetchall()
        finally:
            conn.close()

    counts = {row["canonical"]: int(row["n"]) for row in grouped}
    by_class = []
    bins = []
    cap = capacity()
    for key, rule in RULES.items():
        count = counts.get(key, 0)
        by_class.append({"key": key, "label": rule["label"], "count": count})
        bins.append(
            {
                "key": key,
                "label": rule["label"],
                "bin": rule["bin"],
                "count": count,
                "capacity": cap,
                "fill": count / cap,
            }
        )

    accepted = int(totals["accepted"])
    total = int(totals["scans_total"])
    return {
        "scope": "user" if display_name else "all",
        "display_name": display_name,
        "scans_total": total,
        "accepted": accepted,
        "rejected": total - accepted,
        "points": int(totals["points"]),
        "by_class": by_class,
        "bins": bins,
        "bin_capacity": cap,
    }


def leaderboard(limit: int = 20) -> dict:
    limit = max(1, min(limit, 50))
    with _LOCK:
        conn = connect()
        try:
            rows = conn.execute(
                """
                SELECT
                    display_name,
                    SUM(points) AS points,
                    SUM(accepted) AS accepted_scans
                FROM scans
                GROUP BY display_name
                HAVING SUM(points) > 0
                ORDER BY points DESC, display_name ASC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        finally:
            conn.close()
    return {
        "entries": [
            {
                "display_name": row["display_name"],
                "points": int(row["points"]),
                "accepted_scans": int(row["accepted_scans"]),
            }
            for row in rows
        ]
    }
