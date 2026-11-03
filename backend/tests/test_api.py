import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (16, 16), (40, 80, 60)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_health_and_rejected_uploads(tmp_path, monkeypatch):
    monkeypatch.setenv("ECOTRACK_DB", str(tmp_path / "eco.db"))
    monkeypatch.setenv("MODEL_PATH", str(tmp_path / "missing.pt"))
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.50")

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        body = health.json()
        assert body["status"] == "ok"
        assert body["model_loaded"] is False
        assert "best.pt" in body["model_error"] or "Weights" in body["model_error"]

        bad_name = client.post(
            "/predict",
            data={"display_name": "1"},
            files={"file": ("item.png", _png(), "image/png")},
        )
        assert bad_name.status_code == 400

        not_image = client.post(
            "/predict",
            data={"display_name": "Ava"},
            files={"file": ("notes.txt", b"hello", "text/plain")},
        )
        assert not_image.status_code == 400

        no_weights = client.post(
            "/predict",
            data={"display_name": "Ava"},
            files={"file": ("item.png", _png(), "image/png")},
        )
        assert no_weights.status_code == 503

        rules = client.get("/rules")
        assert rules.status_code == 200
        assert len(rules.json()["classes"]) == 5

        metrics = client.get("/metrics")
        assert metrics.status_code == 200
        assert metrics.json()["available"] is False
        assert metrics.json()["rows"] == []

        empty = client.get("/stats")
        assert empty.status_code == 200
        assert empty.json()["accepted"] == 0
        assert client.get("/leaderboard").json()["entries"] == []
