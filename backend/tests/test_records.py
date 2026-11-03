from app.db import init_db, insert_scan, leaderboard, list_scans, stats
from app.metrics import evaluation_payload


def _scan(name: str, canonical: str, points: int, accepted: bool = True) -> None:
    insert_scan(
        display_name=name,
        canonical=canonical,
        class_name=canonical,
        label=canonical.title(),
        confidence=0.91 if accepted else 0.2,
        bin_name="Dry recyclable — plastic" if accepted else None,
        points=points if accepted else 0,
        accepted=accepted,
        reason=None if accepted else "low_confidence",
        box=None,
        image_width=32,
        image_height=32,
        extra_boxes=0,
    )


def test_stats_count_only_accepted_scans(tmp_path, monkeypatch):
    monkeypatch.setenv("ECOTRACK_DB", str(tmp_path / "eco.db"))
    monkeypatch.setenv("BIN_CAPACITY", "20")
    init_db()
    _scan("Ava", "plastic", 10, True)
    _scan("Ava", "plastic", 0, False)
    _scan("Sam", "metal", 12, True)

    ava = stats("Ava")
    assert ava["accepted"] == 1
    assert ava["rejected"] == 1
    assert ava["points"] == 10
    plastic = next(row for row in ava["by_class"] if row["key"] == "plastic")
    assert plastic["count"] == 1
    assert ava["bins"][0]["fill"] == 1 / 20

    everyone = stats(None)
    assert everyone["accepted"] == 2
    assert everyone["points"] == 22

    board = leaderboard()
    assert [row["display_name"] for row in board["entries"]] == ["Sam", "Ava"]
    assert list_scans("Ava")[0]["accepted"] is False


def test_metrics_csv_is_read_and_missing_file_stays_empty(tmp_path, monkeypatch):
    monkeypatch.setenv("ECOTRACK_DATA", str(tmp_path))
    missing = evaluation_payload()
    assert missing["available"] is False
    assert missing["rows"] == []

    (tmp_path / "test_metrics.csv").write_text(
        "Class,Precision,Recall,F1,mAP50,mAP50-95,Test images,Top-1 acc\n"
        "plastic,0.900,0.800,0.847,0.910,0.720,45,0.844\n"
        "ALL,0.850,0.830,0.840,0.880,0.690,200,0.810\n",
        encoding="utf-8",
    )
    (tmp_path / "test_confusion_counts.csv").write_text(
        ",pred_plastic,pred_paper\ntrue_plastic,10,1\ntrue_paper,2,8\n",
        encoding="utf-8",
    )
    found = evaluation_payload()
    assert found["available"] is True
    assert found["rows"][0]["class_name"] == "plastic"
    assert found["rows"][0]["top1"] == 0.844
    assert found["rows"][1]["class_name"] == "ALL"
    assert found["confusion"]["matrix"] == [[10, 1], [2, 8]]
    assert found["confusion"]["row_labels"] == ["plastic", "paper"]
