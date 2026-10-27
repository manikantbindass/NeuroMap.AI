"""CPU-only synthetic classification. No imaging or clinical inference."""

import argparse
import csv
import hashlib
import io
import json
import platform
from pathlib import Path

import numpy as np
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = ["feature_a", "feature_b", "feature_c"]
FIELDS = ["participant_id", "site", *FEATURES, "label"]


def synthetic_csv(seed=42, participants=240):
    rng = np.random.default_rng(seed)
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(FIELDS)
    for i in range(participants):
        x = rng.normal(size=3)
        y = int(x[0] - 0.6 * x[1] + rng.normal(scale=0.9) > 0)
        for _ in range(2):
            writer.writerow(
                [f"syn-{i:04}", f"site-{i % 3}", *np.round(x + rng.normal(scale=0.1, size=3), 6), y]
            )
    return out.getvalue().encode()


def parse_csv(raw):
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
        if reader.fieldnames != FIELDS:
            raise ValueError("CSV columns must be: " + ",".join(FIELDS))
        rows = list(reader)
        if not 100 <= len(rows) <= 5000:
            raise ValueError("Provide between 100 and 5000 synthetic observations")
        x = np.array([[float(row[f]) for f in FEATURES] for row in rows])
        y = np.array([int(row["label"]) for row in rows])
        groups = np.array([r["participant_id"] for r in rows])
        sites = np.array([r["site"] for r in rows])
        if not np.isfinite(x).all() or np.abs(x).max() > 1e6:
            raise ValueError("Features must be finite and bounded by 1e6")
        if set(y) != {0, 1}:
            raise ValueError("Both binary labels 0 and 1 are required")
        if any(
            not g.startswith("syn-") or len(g) > 40 or not g.replace("-", "").isalnum()
            for g in groups
        ):
            raise ValueError("Use synthetic participant IDs prefixed syn- (letters/digits/hyphens)")
        if any(len(s) > 30 or not s.replace("-", "").isalnum() for s in sites):
            raise ValueError("Site IDs must contain letters/digits/hyphens, at most 30 characters")
        unique = np.unique(groups)
        if len(unique) < 60 or len(np.unique(sites)) > 20:
            raise ValueError("At least 60 participants and at most 20 sites are supported")
        for g in unique:
            if len(set(y[groups == g])) != 1 or len(set(sites[groups == g])) != 1:
                raise ValueError("Each participant must have one label and one site")
        if min(sum(y[np.flatnonzero(groups == g)[0]] == c for g in unique) for c in [0, 1]) < 15:
            raise ValueError("At least 15 participants per class are required")
        return x, y, groups, sites
    except (UnicodeError, TypeError, KeyError, OverflowError) as exc:
        raise ValueError("Malformed UTF-8 CSV") from exc


def split_groups(groups, y, seed):
    unique, idx = np.unique(groups, return_index=True)
    train, rest = train_test_split(unique, test_size=0.4, random_state=seed, stratify=y[idx])
    labels = {g: y[i] for g, i in zip(unique, idx, strict=True)}
    val, test = train_test_split(
        rest, test_size=0.5, random_state=seed, stratify=[labels[g] for g in rest]
    )
    return {
        name: np.flatnonzero(np.isin(groups, ids))
        for name, ids in zip(["train", "validation", "test"], [train, val, test], strict=True)
    }


def metrics(y, p):
    pred = p >= 0.5
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    precision, recall, f1, support = precision_recall_fscore_support(
        y, pred, labels=[0, 1], zero_division=0
    )
    return {
        "roc_auc": float(roc_auc_score(y, p)) if len(set(y)) == 2 else None,
        "pr_auc": float(average_precision_score(y, p)) if len(set(y)) == 2 else None,
        "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "sensitivity": float(tp / (tp + fn)) if tp + fn else None,
        "specificity": float(tn / (tn + fp)) if tn + fp else None,
        "brier": float(brier_score_loss(y, p)),
        "prevalence": float(y.mean()),
        "confusion_matrix": [[int(tn), int(fp)], [int(fn), int(tp)]],
        "per_class": [
            {
                "label": i,
                "precision": float(precision[i]),
                "recall": float(recall[i]),
                "f1": float(f1[i]),
                "support": int(support[i]),
            }
            for i in range(2)
        ],
    }


def train(raw, seed=42, bootstrap=200, c_candidates=None):
    c_candidates = c_candidates or [0.1, 1.0, 10.0]
    if (
        not 20 <= bootstrap <= 2000
        or not 1 <= len(c_candidates) <= 10
        or any(not np.isfinite(c) or c <= 0 for c in c_candidates)
    ):
        raise ValueError("Invalid bounded training configuration")
    x, y, groups, sites = parse_csv(raw)
    splits = split_groups(groups, y, seed)
    tr, va, te = (splits[n] for n in ["train", "validation", "test"])
    candidates = []
    for c in c_candidates:
        model = make_pipeline(
            StandardScaler(), LogisticRegression(C=c, random_state=seed, max_iter=1000)
        )
        model.fit(x[tr], y[tr])
        candidates.append((roc_auc_score(y[va], model.predict_proba(x[va])[:, 1]), c, model))
    score, c, model = max(candidates, key=lambda item: item[0])
    p = model.predict_proba(x[te])[:, 1]
    dummy = DummyClassifier(strategy="prior").fit(x[tr], y[tr])
    rng = np.random.default_rng(seed)
    ids = np.unique(groups[te])
    aucs = []
    for _ in range(bootstrap):
        sampled = rng.choice(ids, size=len(ids), replace=True)
        indices = np.concatenate([np.flatnonzero(groups[te] == g) for g in sampled])
        if len(set(y[te][indices])) == 2:
            aucs.append(roc_auc_score(y[te][indices], p[indices]))
    fpr, tpr, _ = roc_curve(y[te], p)
    scaler, classifier = model.steps[0][1], model.steps[1][1]
    artifact = {
        "features": FEATURES,
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "coef": classifier.coef_[0].tolist(),
        "intercept": float(classifier.intercept_[0]),
    }
    artifact_bytes = json.dumps(artifact, sort_keys=True).encode()
    calibration = []
    for lo in np.linspace(0, 0.8, 5):
        mask = (p >= lo) & (p < lo + 0.2 if lo < 0.8 else p <= 1)
        if mask.any():
            calibration.append(
                {
                    "predicted": float(p[mask].mean()),
                    "observed": float(y[te][mask].mean()),
                    "n": int(mask.sum()),
                }
            )
    return {
        "task": "synthetic-binary-classification",
        "synthetic": True,
        "seed": seed,
        "warning": "Synthetic demonstration only. No disease, diagnosis, or clinical risk inference.",
        "metrics": metrics(y[te], p),
        "baseline": metrics(y[te], dummy.predict_proba(x[te])[:, 1]),
        "roc_auc_ci95": np.quantile(aucs, [0.025, 0.975]).tolist(),
        "bootstrap_valid": len(aucs),
        "bootstrap_method": f"participant-cluster percentile bootstrap, {bootstrap} resamples",
        "configuration": {
            "seed": seed,
            "bootstrap_resamples": bootstrap,
            "C_candidates": c_candidates,
            "threshold": 0.5,
            "split": [0.6, 0.2, 0.2],
        },
        "selected_C": c,
        "validation_auc": float(score),
        "threshold": 0.5,
        "splits": {
            n: {"observations": len(i), "participants": len(np.unique(groups[i]))}
            for n, i in splits.items()
        },
        "split_participants": {n: sorted(np.unique(groups[i]).tolist()) for n, i in splits.items()},
        "site_evaluation": {
            s: metrics(y[te][sites[te] == s], p[sites[te] == s]) for s in np.unique(sites[te])
        },
        "roc": [{"fpr": float(a), "tpr": float(b)} for a, b in zip(fpr, tpr, strict=True)],
        "calibration": calibration,
        "coefficients": dict(zip(FEATURES, artifact["coef"], strict=True)),
        "artifact": artifact,
        "model_sha256": hashlib.sha256(artifact_bytes).hexdigest(),
        "dataset_sha256": hashlib.sha256(raw).hexdigest(),
        "versions": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "sklearn": sklearn.__version__,
        },
    }


def predict(artifact, features):
    x = np.asarray(features, dtype=float)
    if x.ndim != 2 or x.shape[1] != 3 or not np.isfinite(x).all():
        raise ValueError("Expected a finite N by 3 matrix")
    z = ((x - artifact["mean"]) / artifact["scale"]) @ np.array(artifact["coef"]) + artifact[
        "intercept"
    ]
    return 1 / (1 + np.exp(-np.clip(z, -700, 700)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["generate", "train", "evaluate"])
    parser.add_argument("--input", type=Path)
    parser.add_argument("--config", type=Path, default=Path("ml/configs/baseline.json"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.command == "generate":
        args.output.write_bytes(
            synthetic_csv(seed=config["seed"], participants=config["participants"])
        )
    elif args.command == "train":
        args.output.write_text(
            json.dumps(
                train(
                    args.input.read_bytes(),
                    seed=config["seed"],
                    bootstrap=config["bootstrap_resamples"],
                    c_candidates=config["C_candidates"],
                ),
                indent=2,
            ),
            encoding="utf-8",
        )
    else:
        result = json.loads(args.input.read_text())
        artifact_hash = hashlib.sha256(
            json.dumps(result["artifact"], sort_keys=True).encode()
        ).hexdigest()
        if artifact_hash != result["model_sha256"]:
            raise ValueError("Model artifact checksum mismatch")
        args.output.write_text(
            json.dumps(
                {"metrics": result["metrics"], "verified_model_sha256": artifact_hash}, indent=2
            )
        )
