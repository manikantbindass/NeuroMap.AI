import gzip

import nibabel as nib
import numpy as np
import pytest

from backend.app.config import Settings
from backend.app.imaging import inspect_nifti, phantom_bytes


def test_decompression_limit_without_expanding_arbitrary_archive():
    settings = Settings(decoded_bytes=1024)
    with pytest.raises(ValueError, match="Decompressed"):
        inspect_nifti(gzip.compress(phantom_bytes()), "image.nii.gz", settings)


@pytest.mark.parametrize("shape", [(8, 8, 8, 2), (257, 2, 2)])
def test_rejects_unsupported_dimensions(shape):
    raw = nib.Nifti1Image(np.zeros(shape, dtype=np.float32), np.eye(4)).to_bytes()
    with pytest.raises(ValueError, match="Only 3D"):
        inspect_nifti(raw, "image.nii", Settings())


def test_rejects_nonfinite_voxels():
    data = np.zeros((8, 8, 8), dtype=np.float32)
    data[0, 0, 0] = np.nan
    raw = nib.Nifti1Image(data, np.eye(4)).to_bytes()
    with pytest.raises(ValueError, match="Non-finite"):
        inspect_nifti(raw, "image.nii", Settings())
