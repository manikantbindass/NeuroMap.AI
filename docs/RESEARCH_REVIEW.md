# Targeted evidence review

Research reviewed through **2026-10-27**. This is a scoped engineering review, not a systematic review or a claim to cover all literature.

## Search and selection

Searched the web index, PubMed records, publisher pages, arXiv abstracts and official documentation on 2026-10-27. Queries included “TRIPOD AI 2024”, “CLAIM 2024 update”, “Alzheimer CNN data leakage Wen”, “Parkinson trajectory reproduction functional MRI”, “multiple sclerosis lesion segmentation CNN”, “MELD epilepsy graph neural network”, and “brain MRI self supervised foundation model 2025 2026”. Started with the five resources specified in the project request. Included directly relevant standards, primary studies and reproducibility evidence; excluded marketing accuracy claims, unverified benchmarks, and restricted full-text scraping. Most study assessments used abstracts/landing pages, not full methodological replication. Search indexing and access limitations can omit relevant or newly published work. No pooled effect estimates were calculated.

## Imaging and preprocessing

[BIDS](https://bids.neuroimaging.io/standards/index.html) provides conventions for organizing imaging and metadata. This release does not claim BIDS validation. [NiBabel](https://nipy.org/nibabel/nifti_images.html) documents NIfTI data, affine geometry and headers; the implementation uses these to inspect bounded 3D single-file NIfTI-1 volumes. Structural MRI provides anatomical contrast; fMRI measures a time-varying hemodynamic signal; diffusion acquisitions require gradients and suitable models. They are not interchangeable inputs. This release rejects 4D acquisitions rather than pretending to preprocess them.

Registration, normalization, bias correction, skull stripping, motion correction, segmentation and parcellation require modality-specific validated pipelines, acquisition metadata and QC. Simple intensity windowing for display is not any of these. DICOM conversion/de-identification is deferred. NIfTI files can retain identity through headers, filenames and facial anatomy.

## Methods and disease tasks

[Wen et al. (2020)](https://doi.org/10.1016/j.media.2020.101694) reviewed and reproduced Alzheimer MRI classification, highlighting leakage and generalization problems. This supports participant partitions and straightforward comparisons before CNN complexity. Alzheimer diagnostic-group classification and conversion prognosis need distinct populations, timepoints, labels and follow-up rules.

[Parkinson trajectory reproduction study](https://arxiv.org/abs/2403.15405) (submitted 2024, revised 2025) examines reproduction with clinical/fMRI features; it is evidence for specifying cohorts and reproducible code, not permission to generalize to Parkinson diagnosis. [MS lesion CNN work](https://arxiv.org/abs/1803.09172) (2018) evaluates segmentation, a different endpoint from disease risk. [MELD GNN study](https://pubmed.ncbi.nlm.nih.gov/39992650/) (2025) uses multicenter data and site-independent testing for focal cortical dysplasia detection. Graphs require defensible nodes, edges and preprocessing; they are not justified by the presence of brain images alone.

Classical regularized models on suitable derived features provide inspectable baselines. 3D CNNs and transfer learning require labeled volumes, memory, preprocessing controls and independent evaluation. Multimodal fusion adds missing-modality, alignment and confounding problems. These are proposed research extensions, not implemented models.

## Newer foundation models

[BrainIAC, Nature Neuroscience (2026)](https://doi.org/10.1038/s41593-026-02202-6) describes self-supervised brain MRI representation learning; [NeuroVFM, Nature Medicine (2026)](https://doi.org/10.1038/s41591-026-04497-1) explores health-system-scale volumetric pretraining. They are promising research directions, not validation of this application. [Brain2Vec](https://arxiv.org/abs/2610.28411), submitted 2026-10-20, is a recent preprint identified in this search, assessed only at abstract level. No weights, licenses, hardware suitability or local performance were verified for these models; none is bundled.

[MedGemma official documentation](https://developers.google.com/health-ai-developer-foundations/medgemma) includes MRI-capable adaptation in its newer family and requires use-case validation. It is not selected as a default disease predictor. [MONAI](https://monai.readthedocs.io/en/stable/) is an appropriate optional framework for future imaging training, not needed for the present CPU tabular workflow. Claims in provider documentation are not independent clinical evidence.

## Evaluation, interpretation and governance

[TRIPOD+AI (2024)](https://doi.org/10.1136/bmj-2023-078378) and [CLAIM (2024)](https://doi.org/10.1148/ryai.240300) inform reporting. Record intended population, label provenance, partitions, preprocessing, tuning, uncertainty and failure cases. They are reporting guidance, not certification. The implementation makes no claim of checklist completeness.

Split participants before fitting transforms; keep repeat observations together. Use training data for scaling, validation for model selection, and test for final evaluation. Scanner/site holdout, duplicate detection, missing data, confounding and external validation must be prespecified for actual research cohorts. Report prevalence, class-specific outcomes and calibration alongside discrimination. [scikit-learn calibration documentation](https://scikit-learn.org/stable/modules/calibration.html) informs reliability plotting. Current probabilities are uncalibrated; Brier scores and five-bin reliability are descriptive. Bootstrap intervals quantify finite synthetic test-sample variation, not clinical uncertainty. Coefficients/saliency do not establish causality.

[FDA GMLP page](https://www.fda.gov/medical-devices/artificial-intelligence-enabled-medical-devices/good-machine-learning-practice-medical-device-development-guiding-principles) points to the [IMDRF final principles, 29 January 2025](https://www.imdrf.org/documents/good-machine-learning-practice-medical-device-development-guiding-principles). They motivate lifecycle documentation and appropriate independent evaluation. Future intended clinical use requires jurisdiction-specific regulatory, privacy and institutional review. This is not legal advice or a declaration of compliance.

## Selection conclusion

No authorized disease-labeled cohort exists in the repository. Therefore release 0.1.0 implements image inspection and a synthetic binary task. It does not train on MRI, output disease probabilities, infer neuroanatomical regions or claim clinical usefulness. See MODEL_SELECTION.md for the executable protocol and DATASET_CATALOG.md for access prerequisites.
