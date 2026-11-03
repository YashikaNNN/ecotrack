from app.rules import canonical, clean_name, decide, threshold


def test_canonical_aliases():
    assert canonical("Plastic") == "plastic"
    assert canonical("e-waste") == "ewaste"
    assert canonical("cardboard") == "paper"
    assert canonical("organic waste") == "organic"


def test_name_rules():
    assert clean_name("  Yashika  Nagpal ") == "Yashika Nagpal"
    for bad in ["A", "1Name", "ok!", ""]:
        try:
            clean_name(bad)
        except ValueError:
            continue
        raise AssertionError(f"expected rejection for {bad!r}")


def test_low_confidence_adds_nothing(monkeypatch):
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.50")
    decision = decide("plastic", 0.49)
    assert decision.accepted is False
    assert decision.reason == "low_confidence"
    assert decision.points == 0
    assert decision.bin_name is None


def test_exact_cutoff_is_accepted(monkeypatch):
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.50")
    decision = decide("ewaste", 0.50)
    assert decision.accepted is True
    assert decision.bin_name == "Separate e-waste collection"
    assert decision.points == 15
    assert threshold() == 0.5


def test_unknown_class_has_no_bin(monkeypatch):
    monkeypatch.setenv("CONFIDENCE_THRESHOLD", "0.50")
    decision = decide("glass", 0.91)
    assert decision.accepted is False
    assert decision.reason == "unknown_class"
    assert decision.points == 0


def test_missing_detection():
    decision = decide(None, None)
    assert decision.reason == "no_detection"
    assert decision.points == 0
