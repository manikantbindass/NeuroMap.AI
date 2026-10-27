import json

import numpy as np
import pytest

from ml.pipeline import metrics, parse_csv, predict, split_groups, synthetic_csv, train


def test_participant_partitions_and_reproducibility():
    raw = synthetic_csv()
    x, y, groups, _ = parse_csv(raw)
    splits = split_groups(groups, y, 42)
    ids = [set(groups[i]) for i in splits.values()]
    assert all(not ids[i] & ids[j] for i in range(3) for j in range(i + 1, 3))
    assert sum(len(s) for s in ids) == 240
    first, second = train(raw), train(raw)
    assert first == second
    loaded = json.loads(json.dumps(first["artifact"]))
    assert np.allclose(predict(loaded, x), predict(first["artifact"], x))
    assert first["splits"]["test"]["participants"] == 48
    assert first["metrics"]["roc_auc"] > first["baseline"]["roc_auc"]


def test_metrics_against_hand_calculation():
    m = metrics(np.array([0, 0, 1, 1]), np.array([0.1, 0.7, 0.8, 0.2]))
    assert m["confusion_matrix"] == [[1, 1], [1, 1]]
    assert m["sensitivity"] == m["specificity"] == m["balanced_accuracy"] == 0.5
    assert m["brier"] == pytest.approx((0.01 + 0.49 + 0.04 + 0.64) / 4)


@pytest.mark.parametrize(
    "raw",
    [
        b"wrong\n",
        synthetic_csv().replace(b"syn-0000", b"real-000", 1),
        synthetic_csv().replace(b"0.335663", b"nan"),
    ],
)
def test_invalid_csv(raw):
    if b"nan" not in raw and raw == synthetic_csv():
        raw = raw.replace(b"feature_a", b"missing")
    with pytest.raises(ValueError):
        parse_csv(raw)


def test_invalid_prediction():
    with pytest.raises(ValueError):
        predict({}, [[1, 2]])
