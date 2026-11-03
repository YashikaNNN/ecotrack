"""Fixed bin and eco-point rules.

The project documents ask for a lookup from waste class to bin, and for
point values that differ by category. They do not publish the numbers.
The values below are prototype rules for this application, not outputs
of the neural network and not carbon credits.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass

# Evaluation script detection floor. Boxes weaker than this are treated as
# "nothing found". Acceptance for a bin and points uses threshold(), which
# is higher.
DETECT_FLOOR = 0.05

RULES: dict[str, dict[str, str | int]] = {
    "plastic": {"label": "Plastic", "bin": "Dry recyclable — plastic", "points": 10},
    "paper": {"label": "Paper", "bin": "Dry recyclable — paper", "points": 8},
    "metal": {"label": "Metal", "bin": "Dry recyclable — metal", "points": 12},
    "organic": {"label": "Organic", "bin": "Organic / wet waste", "points": 8},
    "ewaste": {"label": "E-waste", "bin": "Separate e-waste collection", "points": 15},
}

# The proposal merges TrashNet cardboard into paper. If a checkpoint emits
# cardboard as its own class, it follows the paper rule.
_ALIASES = {
    "plastic": "plastic",
    "paper": "paper",
    "cardboard": "paper",
    "metal": "metal",
    "organic": "organic",
    "organicwaste": "organic",
    "ewaste": "ewaste",
    "electronicwaste": "ewaste",
    "electronics": "ewaste",
}

_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9 .'-]*$")


def threshold() -> float:
    raw = os.getenv("CONFIDENCE_THRESHOLD", "0.50")
    try:
        value = float(raw)
    except ValueError:
        return 0.5
    if not 0 < value <= 1:
        return 0.5
    return value


def capacity() -> int:
    raw = os.getenv("BIN_CAPACITY", "20")
    try:
        value = int(raw)
    except ValueError:
        return 20
    if value < 1:
        return 20
    return value


def detect_floor() -> float:
    return min(DETECT_FLOOR, threshold())


def canonical(name: str) -> str:
    key = re.sub(r"[^a-z0-9]", "", name.lower())
    return _ALIASES.get(key, key)


def clean_name(name: str) -> str:
    cleaned = " ".join(name.split())
    if not 2 <= len(cleaned) <= 40 or not _NAME.fullmatch(cleaned):
        raise ValueError(
            "Use a name of 2 to 40 characters, starting with a letter. "
            "Letters, numbers, spaces, apostrophes, and hyphens are allowed."
        )
    return cleaned


@dataclass(frozen=True)
class Decision:
    accepted: bool
    reason: str | None
    canonical_name: str | None
    label: str | None
    bin_name: str | None
    points: int
    message: str


def decide(raw_name: str | None, confidence: float | None) -> Decision:
    cutoff = threshold()
    if raw_name is None or confidence is None:
        return Decision(
            accepted=False,
            reason="no_detection",
            canonical_name=None,
            label=None,
            bin_name=None,
            points=0,
            message=(
                "No waste item was found. Use a photo where one item is clearly visible."
            ),
        )

    key = canonical(raw_name)
    rule = RULES.get(key)
    label = str(rule["label"]) if rule else raw_name
    percent = f"{confidence * 100:.1f}%"

    if confidence < cutoff:
        return Decision(
            accepted=False,
            reason="low_confidence",
            canonical_name=key,
            label=label,
            bin_name=None,
            points=0,
            message=(
                f"The best guess is {label} at {percent}, which is below the "
                f"{cutoff * 100:.0f}% cutoff. No bin is recommended and no points "
                "are added. Try a clearer photo of a single item."
            ),
        )

    if rule is None:
        return Decision(
            accepted=False,
            reason="unknown_class",
            canonical_name=key,
            label=label,
            bin_name=None,
            points=0,
            message=(
                f"The model predicted {raw_name} at {percent}. "
                "EcoTrack has no bin rule for that class, so nothing was stored as a sorted item."
            ),
        )

    points = int(rule["points"])
    bin_name = str(rule["bin"])
    return Decision(
        accepted=True,
        reason=None,
        canonical_name=key,
        label=str(rule["label"]),
        bin_name=bin_name,
        points=points,
        message=(
            f"{label} at {percent}. Use the {bin_name} bin. "
            f"This scan adds {points} points."
        ),
    )


def rules_payload() -> dict:
    return {
        "threshold": threshold(),
        "detect_floor": detect_floor(),
        "bin_capacity": capacity(),
        "classes": [
            {
                "key": key,
                "label": rule["label"],
                "bin": rule["bin"],
                "points": rule["points"],
            }
            for key, rule in RULES.items()
        ],
        "note": (
            "Bin names and points are fixed application rules. They are not "
            "predicted by YOLOv8n and they are not certified carbon credits. "
            "The project documents require category-specific points and do not "
            "publish the numbers, so this prototype uses the values shown here. "
            "A scan is counted only when confidence meets the cutoff."
        ),
    }
