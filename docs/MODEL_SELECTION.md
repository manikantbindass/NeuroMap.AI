# Executable model protocol

## Implemented task

Synthetic binary classification for engineering and education only. No target clinical population. Inputs: UTF-8 CSV, exact ordered columns `participant_id,site,feature_a,feature_b,feature_c,label`. IDs start `syn-`; labels 0/1. At least 60 participants, 15 per class, 100–5000 observations, at most 20 sites. Features must be finite and bounded by 1e6. Every participant has one site and label. Missing values are rejected, not silently imputed. No MRI-derived measures, disease labels, clinical features or demographics are represented.

The generated fixture has 240 participants, two observations per participant and three sites. Features and label are mathematical random variables (see `ml/pipeline.py`). This can verify software behavior only.

## Training / evaluation

Unique participants are split stratified by class: 60% training, 20% validation, 20% test, seed 42. All observations for a participant remain together. StandardScaler fits training observations only. Three L2 logistic models with C in 0.1/1/10 are compared on validation ROC-AUC; the first maximum is selected. No refit on test data. Decision threshold remains 0.5. A training-prior DummyClassifier provides the comparison.

Test outputs include ROC-AUC, average precision (labeled PR-AUC), balanced accuracy, F1, sensitivity, specificity, class support/precision/recall/F1, confusion matrix, prevalence, Brier score and five-bin reliability. ROC-AUC percentile CI resamples participants with replacement, preserving their repeated rows, for 200 resamples, discarding single-class draws. This modest bootstrap budget is a demo choice, not a power calculation. Site breakdown is descriptive; sites are **not held out**, and no external validity is established. Probabilities are not recalibrated.

Standardized coefficients explain the fitted linear function only. JSON coefficients, scaling and intercept can be reloaded without pickle. Model SHA-256 is calculated over sorted JSON. The report stores data checksum, software versions, seed, split membership and selected configuration. Registry is the persisted completed job/report; no deployed clinical model exists.

## Deferred selection

Future Alzheimer diagnostic-group baseline needs an approved cohort, verified visit labels, validated preprocessing and regional feature extraction. Compare regularized linear models before 3D CNNs. MONAI/PyTorch, multimodal fusion, graph methods and foundation encoders remain optional research extensions requiring licenses, resource budgets, locked external tests and appropriate model cards. Do not interpret a synthetic ROC-AUC as MRI or disease prediction performance.
