"""EcoTrack API: image prediction, scan history, and simulated bin stats."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from app.db import init_db, insert_scan, leaderboard, list_scans, stats
from app.inference import infer, load_model, state
from app.metrics import evaluation_payload
from app.rules import clean_name, decide, detect_floor, rules_payload, threshold

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ecotrack")

MAX_BYTES = 8 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    load_model()
    yield


app = FastAPI(
    title="EcoTrack",
    version="1.0.0",
    summary="Waste-class prediction, bin rules, and scan history for the EcoTrack prototype.",
    lifespan=lifespan,
)

_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"service": "ecotrack", "health": "/health", "docs": "/docs"}


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": state.loaded,
        "model_error": state.error,
        "weights_file": state.weights_file,
        "classes": state.classes,
        "threshold": threshold(),
        "detect_floor": detect_floor(),
        "bin_capacity": rules_payload()["bin_capacity"],
    }


@app.get("/rules")
def rules() -> dict:
    return rules_payload()


@app.get("/metrics")
def metrics() -> dict:
    return evaluation_payload()


@app.get("/scans")
def scans(display_name: str = Query(...), limit: int = Query(50)) -> dict:
    try:
        name = clean_name(display_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"display_name": name, "scans": list_scans(name, limit)}


@app.get("/stats")
def scan_stats(display_name: str | None = Query(None)) -> dict:
    name = None
    if display_name is not None and display_name.strip() != "":
        try:
            name = clean_name(display_name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    return stats(name)


@app.get("/leaderboard")
def points_leaderboard(limit: int = Query(20)) -> dict:
    return leaderboard(limit)


def _open_image(data: bytes) -> Image.Image:
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Use an image smaller than 8 MB.")
    try:
        image = Image.open(BytesIO(data))
        image_format = image.format
        image = image.convert("RGB")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="That file could not be read as an image. Use a JPEG, PNG, or WebP.",
        ) from exc
    if image_format not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Use a JPEG, PNG, or WebP image.",
        )
    return image


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    display_name: str = Form(...),
) -> dict:
    try:
        name = clean_name(display_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    data = await file.read()
    image = _open_image(data)

    if not state.loaded:
        raise HTTPException(
            status_code=503,
            detail=state.error or "Model weights are not loaded.",
        )

    try:
        detected = infer(image)
    except Exception as exc:
        log.exception("Prediction failed")
        raise HTTPException(
            status_code=500,
            detail="The model could not read this image. Try another photo.",
        ) from exc

    decision = decide(detected.raw_name, detected.confidence)
    scan_id = insert_scan(
        display_name=name,
        canonical=decision.canonical_name,
        class_name=detected.raw_name,
        label=decision.label,
        confidence=detected.confidence,
        bin_name=decision.bin_name,
        points=decision.points,
        accepted=decision.accepted,
        reason=decision.reason,
        box=detected.box,
        image_width=image.width,
        image_height=image.height,
        extra_boxes=detected.extra_boxes,
    )
    return {
        "scan_id": scan_id,
        "accepted": decision.accepted,
        "reason": decision.reason,
        "message": decision.message,
        "threshold": threshold(),
        "display_name": name,
        "class_id": detected.class_id,
        "class_name": detected.raw_name,
        "label": decision.label,
        "confidence": detected.confidence,
        "bin": decision.bin_name,
        "points": decision.points,
        "box": detected.box,
        "image_width": image.width,
        "image_height": image.height,
        "extra_boxes": detected.extra_boxes,
    }
