# Reproducible experiments and dataset onboarding

The lightweight scientific dependencies are included in the backend lock. No MONAI/PyTorch GPU runtime or pretrained weights are installed.

From root, using the environment Python:

```powershell
.\.venv\Scripts\python.exe -m ml.pipeline generate --output data/synthetic.csv
.\.venv\Scripts\python.exe -m ml.pipeline train --input data/synthetic.csv --output data/experiment.json
.\.venv\Scripts\python.exe -m ml.pipeline evaluate --input data/experiment.json --output data/evaluation.json
```

Generate writes an original seeded fixture. Train writes computed metrics, coefficient artifact, checksums and split IDs. Evaluate validates the stored model checksum and exports recorded evaluation; it does not rerun training or recompute an independent external test. `ml/configs/baseline.json` documents default parameters; see the CLI `--config` option for the supported executable configuration.

`ml.pipeline.predict(artifact, N_by_3_features)` reloads the explicit JSON model without pickle. Shape and finite-value checks protect the interface. The registry is the database's completed experiment reports; each report contains model and data SHA-256 plus versions and configuration. It is not a deployment registry or automatic model replacement system.

Before onboarding a real research cohort, complete the [dataset card](research/DATASET_CARD.md), approved-access checks, label/timepoint rules, de-identification review, acquisition QC, repeated-visit and duplicate checks. Replace the synthetic task only with a versioned protocol, appropriate ethics/DUA authorization and separate train/validation/external test cohorts. Compare majority/prior, linear and suitable imaging models. Do not repurpose `syn-` IDs to disguise real participants.

Testing includes participant-disjoint partitions, deterministic repeated training, known-answer metrics, malformed features and JSON round trips. Real scanner/site holdout, longitudinal leakage audits, sex/age/demographic subgroup metrics and external clinical evaluation are not available on artificial features.
