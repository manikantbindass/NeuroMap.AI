import gzip
import io

import nibabel as nib
import numpy as np


def inspect_nifti(raw, name, settings):
    if name.lower().endswith(".nii.gz"):
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:
                raw = stream.read(settings.decoded_bytes + 1)
        except (OSError, EOFError) as exc:
            raise ValueError("Invalid gzip stream") from exc
    if len(raw) > settings.decoded_bytes:
        raise ValueError("Decompressed image exceeds limit")
    try:
        header = nib.Nifti1Header.from_fileobj(io.BytesIO(raw), check=True)
        shape = header.get_data_shape()
        if (
            len(shape) != 3
            or min(shape) < 2
            or max(shape) > 256
            or np.prod(shape, dtype=np.int64) > settings.max_voxels
        ):
            raise ValueError(
                "Only 3D NIfTI-1 volumes, 2–256 voxels per axis and at most 4 million voxels"
            )
        dtype = header.get_data_dtype()
        if dtype.kind not in "iuf" or dtype.itemsize > 8:
            raise ValueError("Unsupported voxel type")
        offset = float(header["vox_offset"])
        if (
            not np.isfinite(offset)
            or offset < 352
            or offset != int(offset)
            or offset + np.prod(shape) * dtype.itemsize > len(raw)
        ):
            raise ValueError("Truncated or invalid voxel payload")
        if bytes(header["magic"]) != b"n+1\x00":
            raise ValueError("Only single-file NIfTI-1 is supported")
        img = nib.Nifti1Image.from_bytes(raw)
        affine = img.affine
        zooms = img.header.get_zooms()
        if (
            not np.isfinite(affine).all()
            or abs(np.linalg.det(affine[:3, :3])) < 1e-9
            or any(not np.isfinite(z) or z <= 0 for z in zooms)
        ):
            raise ValueError("Invalid spatial transform or voxel sizes")
        volume = img.get_fdata(dtype=np.float32)
        if not np.isfinite(volume).all():
            raise ValueError("Non-finite scaled voxel intensities")
        lo, hi = np.percentile(volume, [1, 99])
        if hi <= lo:
            lo, hi = float(volume.min()), float(volume.max())
        scaled = np.clip((volume - lo) / max(float(hi - lo), 1e-9), 0, 1)
        details = {
            "shape": list(shape),
            "voxel_sizes": list(map(float, zooms)),
            "orientation": list(nib.aff2axcodes(affine)),
            "spatial_unit": img.header.get_xyzt_units()[0],
            "affine": affine.tolist(),
            "intensity_min": float(volume.min()),
            "intensity_max": float(volume.max()),
            "display_window": [float(lo), float(hi)],
            "nonzero_fraction": float(np.count_nonzero(volume) / volume.size),
            "notice": "Header geometry and intensity inspection only; no diagnostic quality score or segmentation.",
        }
        return scaled.astype(np.float32), details
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Malformed or unsupported NIfTI-1 image") from exc


def preview(volume, affine):
    stride = max(1, int(np.ceil(max(volume.shape) / 48)))
    sampled = volume[::stride, ::stride, ::stride]
    coords = np.argwhere(sampled > 0.25)
    coords = coords[:: max(1, int(np.ceil(len(coords) / 18000)))]
    positions = nib.affines.apply_affine(np.asarray(affine), coords * stride)
    values = sampled[tuple(coords.T)]
    return {
        "positions": positions.round(3).tolist(),
        "values": values.round(3).tolist(),
        "stride": stride,
    }


def phantom_bytes():
    x, y, z = np.mgrid[-1:1:48j, -1:1:56j, -1:1:48j]
    r = (x / 0.8) ** 2 + (y / 0.9) ** 2 + (z / 0.85) ** 2
    data = np.where(r < 1, 0.5 + 0.2 * np.cos(30 * r) + 0.15 * z, 0).astype(np.float32)
    data[(abs(x) < 0.035) & (z > -0.3)] = 0
    return nib.Nifti1Image(data, np.diag([2.0, 2.0, 2.0, 1.0])).to_bytes()
