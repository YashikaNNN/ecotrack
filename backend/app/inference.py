"""Load the trained YOLOv8 checkpoint and run one prediction.

Ultralytics resizes and normalises the photo inside predict(). Training
augmentations (colour changes, rotation, mosaic) are not applied here.
The checkpoint is whatever file MODEL_PATH points at. This module does
not train or modify it.
"""

from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from app.rules import detect_floor

log = logging.getLogger("ecotrack")

ROOT = Path(__file__).resolve().parents[1]
_LOCK = threading.Lock()


@dataclass
class Detection:
    raw_name: str | None
    class_id: int | None
    confidence: float | None
    box: list[float] | None
    extra_boxes: int


class ModelState:
    def __init__(self) -> None:
        self.model = None
        self.loaded = False
        self.error: str | None = "Model weights are not loaded."
        self.classes: list[dict[str, int | str]] = []
        self.weights_file = "backend/weights/best.pt"


state = ModelState()


def weights_path() -> Path:
    raw = os.getenv("MODEL_PATH", "weights/best.pt")
    path = Path(raw)
    return path if path.is_absolute() else ROOT / path


def _public_weights(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(ROOT.resolve())
        return f"backend/{relative.as_posix()}"
    except ValueError:
        return path.name


def _class_pairs(model) -> list[tuple[int, str]]:
    names = model.names
    if isinstance(names, dict):
        return [(int(key), str(value)) for key, value in sorted(names.items(), key=lambda item: int(item[0]))]
    return [(index, str(name)) for index, name in enumerate(names)]


def load_model() -> None:
    path = weights_path()
    state.weights_file = _public_weights(path)
    state.model = None
    state.classes = []
    state.loaded = False

    if not path.is_file():
        state.error = (
            f"Weights file not found ({state.weights_file}). "
            "Copy the trained best.pt into that folder and restart the API."
        )
        log.warning(state.error)
        return

    try:
        from ultralytics import YOLO
    except ImportError:
        state.error = "Ultralytics is not installed in this Python environment."
        log.warning(state.error)
        return

    try:
        model = YOLO(str(path))
    except Exception:
        log.exception("Could not load weights at %s", path)
        state.error = (
            "The weights file could not be loaded. "
            "Use the Ultralytics checkpoint from ecotrack_v1 (best.pt)."
        )
        return

    state.model = model
    state.loaded = True
    state.error = None
    state.classes = [{"id": index, "name": name} for index, name in _class_pairs(model)]
    log.info("Loaded %s with classes %s", state.weights_file, state.classes)


def infer(image: Image.Image) -> Detection:
    if not state.loaded or state.model is None:
        raise RuntimeError(state.error or "Model weights are not loaded.")

    floor = detect_floor()
    with _LOCK:
        results = state.model.predict(
            source=image,
            conf=floor,
            imgsz=640,
            verbose=False,
        )

    result = results[0]
    boxes = result.boxes
    if boxes is None or len(boxes) == 0:
        return Detection(None, None, None, None, 0)

    index = int(boxes.conf.argmax())
    confidence = float(boxes.conf[index])
    class_id = int(boxes.cls[index])
    names = state.model.names
    raw_name = str(names[class_id]) if isinstance(names, dict) else str(names[class_id])
    xyxy = boxes.xyxy[index].tolist()
    box = [round(float(value), 1) for value in xyxy]
    return Detection(raw_name, class_id, confidence, box, max(len(boxes) - 1, 0))
