# Dataset card: generated engineering fixtures v0.1.0

Source: original `ml.pipeline.synthetic_csv` and `backend.app.imaging.phantom_bytes` code. License: MIT. No real participant records, source images, consented human cohort, medical labels or third-party weights.

Feature fixture: seed 42, 240 artificial participants, two noisy observations of three independent-normal underlying features, three synthetic site identifiers. Binary target is a thresholded linear signal plus Gaussian noise. There is no biological interpretation. Repeated observations share label/site and must remain in one partition. No missing data, real-world acquisition bias, disease prevalence or population representation is modeled.

Image fixture: 48×56×48 scalar float32 values, artificial ellipsoid with sinusoidal intensity structure and a gap. Diagonal affine spacing 2; header may report unknown physical units. No MRI acquisition, anatomical atlas, tissue segmentation or disease lesion. Suitable for parser/viewer smoke tests only.

Generated on demand; files stay under ignored private storage. API persists source SHA-256 and allowlisted metadata. No specimen images or datasets are redistributed in source archives. Neutral synthetic IDs are retained in reports for split integrity. Delete through API or stop service and clear a dedicated disposable test workspace.

For a new real dataset, create a separate card recording official source/version, exact eligible sample count, label definitions and timing, data-use terms, authorized users, consent/ethics, modality/protocol, site/scanner metadata, QC rules, missingness, demographic distribution, known biases, participant linkage, split policy, checksum manifest, retention and deletion requirements. This template is a checklist for onboarding, not evidence that a dataset has passed review.
