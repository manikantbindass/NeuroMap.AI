# User guide

1. Sign into the private workspace using the configured server password. Refreshing the page or restarting the server requires signing in again.
2. Choose **Create demo** to generate a feature cohort and a non-anatomical image phantom. These are marked Synthetic demo. Counts are queried from the database; no clinical records are invented.
3. In **Datasets**, download a CSV/NIfTI fixture or add a file. Confirm authorization and removal of identifying data. Use neutral filenames. CSV training accepts only the documented synthetic schema. NIfTI-1 accepts 3D scalar volumes, bounded dimensions and valid geometry; no DICOM, ZIP, 4D fMRI or paired .hdr/.img files.
4. Choose **Run analysis** beside a dataset. The experiment history updates automatically. CSV executes the synthetic protocol; images execute inspection. Failed or interrupted jobs are explicitly marked. A queued job can be cancelled; running jobs are not interruptible.
5. Use **Brain viewer** to select an image, orbit/zoom the voxel point cloud, choose an index axis/slice and adjust display threshold. Geometry units and orientation come from the header. The default procedural form is not an atlas. Index slices are not reoriented to clinical display conventions.
6. Open **Evaluate** on a completed CSV run. Review baseline comparisons, ROC, reliability, confusion matrix, participant counts, coefficients and uncertainty caveats. Select a particular run from history; no synthetic score establishes medical validity.
7. Export the JSON **Report** for metrics, model coefficients, dataset/model hashes, split IDs, versions and parameters. Store exported reports privately. No patient PDF is generated.
8. Delete an unused dataset from Datasets to remove its payload and reports. Wait for active jobs first. Minimal audit IDs remain; backups have their own retention. Sign out when finished.

Themes are under Settings or the sun/moon button. The layout adapts to mobile widths, and reduced-motion preferences disable automatic rotation. This is a single-owner workspace, not an invitation/sharing platform. Use local docs for architecture and API details.
