# Safety and limitations

NeuroMap AI 0.1.0 is research/educational software. It is not a diagnostic tool, medical device, clinical decision support system or validated disease-risk model. Do not use outputs for patient care. The only classifier uses artificial features and labels. Image inspection does not estimate disease, identify brain regions or provide a diagnostic QC score.

The viewer uses intensity thresholding, percentile windowing and downsampled voxel points. It does not perform segmentation or validated surface reconstruction. Axis slices retain index orientation and are not clinical radiological displays. A procedural form and generated phantom are explicitly non-anatomical. Non-brain images can satisfy the format parser.

No real-world accuracy, external validation, subgroup fairness, longitudinal prognosis, scanner robustness or calibration assurance is claimed. Synthetic sites are not clinical institutions. Intervals describe sampling variation only. Coefficients are associations, not causal mechanisms. There are no disease-specific foundation models bundled.

This release has one authenticated owner role per server, no separate users, no public demo account and no tenant isolation. Session token is in browser memory; refresh requires sign-in. Local use binds loopback. Remote use requires TLS, firewall/private networking, OS storage ACLs, encrypted volumes, institutional governance and operational review. No compliance with HIPAA, GDPR, Indian DPDP or device regulations is asserted.

Data remain until manual deletion. Deleting a dataset deletes its payload and reports; minimal resource-ID audit records remain in the database. Backups may retain prior copies. NIfTI validation does not de-identify faces or content. Neutral filenames and authorized de-identified inputs remain the uploader's responsibility. The synthetic-only CSV policy is an attestation and structural constraint, not a proof that data are artificial.

File and decompression caps, shape limits, allowlists, authentication, request limits and restricted CORS reduce attack surface. Native scientific parsers still process untrusted inputs in the API process; use private trusted uploads only. Strong process isolation/sandboxing, a distributed limiter, multi-user authorization, object storage, independently reviewed security, and hardened institutional hosting are prerequisites for public or sensitive-data deployment.
