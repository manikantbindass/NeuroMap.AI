# Model card: synthetic logistic baseline v0.1.0

- Intended use: verify a reproducible software workflow and teach evaluation.
- Prohibited interpretation: disease diagnosis, patient risk, prognosis, brain-region interpretation, clinical decision support.
- Population: artificial participants only; no demographic representativeness.
- Inputs: three finite dimensionless features, synthetic participant/site IDs, binary generated labels.
- Architecture: training-only StandardScaler + L2 logistic regression. C chosen on validation ROC-AUC from 0.1, 1, 10. Threshold 0.5; seed 42.
- Comparator: training-prior DummyClassifier.
- Data: original generated cohort, 240 participants with two observations. External synthetic CSVs must satisfy validation constraints. No clinical cohort or MRI features used.
- Splits: stratified unique participants 60/20/20, repeated observations kept together. No site holdout.
- Evaluation: final test discrimination, per-class measures, Brier/reliability, confusion matrix, prevalence; 200 participant-cluster bootstrap ROC-AUC CI. Actual scores vary with uploaded data; retrieve them from the completed report, not a promotional benchmark.
- Explanation: standardized coefficients; associational only.
- Artifact: JSON coefficients/scaler, SHA-256 of sorted JSON, data checksum, exact package versions and partition IDs inside report. No pickle. Loading requires matching feature order.
- Limitations: generated signal, small test sample, no missing-data modeling, no clinical calibration, no causal explanation, no fairness or external-validity claim. Correlated rows remain in evaluation but intervals cluster by participant.
- Lifecycle: explicit run submission only; no automatic deployment or retraining. Deleting dataset removes associated model/report records. Model extensions require reviewed data and a new card/version.
