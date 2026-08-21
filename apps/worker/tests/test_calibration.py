"""V2 readiness calibration curve."""

from __future__ import annotations

from geo_worker.methodology.v2.scoring import calibrate_score


def test_endpoints_fixed() -> None:
    assert calibrate_score(0) == 0.0
    assert calibrate_score(100) == 100.0


def test_monotonic_non_decreasing() -> None:
    prev = -1.0
    for x in range(0, 101):
        y = calibrate_score(float(x))
        assert y >= prev
        prev = y


def test_lifts_the_mid_high_range_but_not_the_noise_floor() -> None:
    # Weak/noise stays weak; strong-but-capped raw scores reach Strong/Excellent.
    assert calibrate_score(6) < 15  # negative-control range stays low
    assert calibrate_score(40) < 50  # novelty sites stay below "Needs improvement"
    assert calibrate_score(66) >= 75  # a strong real site clears "Good"
    assert calibrate_score(77) >= 85  # a benchmark-topping site reaches "Strong"
    assert calibrate_score(85) >= 90  # a near-ideal site reaches "Excellent"


def test_clamps_out_of_range() -> None:
    assert calibrate_score(-10) == 0.0
    assert calibrate_score(150) == 100.0
