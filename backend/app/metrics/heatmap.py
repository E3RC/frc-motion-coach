import numpy as np
from typing import Optional
from ..storage.database import Database


class HeatmapComputer:
    def __init__(self, grid_size: int = 100):
        self.grid_size = grid_size

    def compute(self, db: Database, run_ids: Optional[list[int]] = None) -> dict:
        from collections import Counter

        if run_ids:
            all_samples = []
            for rid in run_ids:
                all_samples.extend(db.get_samples(rid))
        else:
            runs = db.get_runs()
            all_samples = []
            for r in runs:
                all_samples.extend(db.get_samples(r.id))

        if not all_samples:
            return {"grid": [], "max_count": 0, "total_samples": 0}

        xs = np.array([s.field_x for s in all_samples])
        ys = np.array([s.field_y for s in all_samples])

        if len(xs) == 0:
            return {"grid": [], "max_count": 0, "total_samples": 0}

        max_x = max(np.max(xs), 27.0)
        max_y = max(np.max(ys), 27.0)
        min_x = min(np.min(xs), 0.0)
        min_y = min(np.min(ys), 0.0)

        x_bins = np.linspace(min_x, max_x, self.grid_size + 1)
        y_bins = np.linspace(min_y, max_y, self.grid_size + 1)

        grid, _, _ = np.histogram2d(xs, ys, bins=[x_bins, y_bins])
        grid = grid.T

        from scipy.ndimage import gaussian_filter
        grid = gaussian_filter(grid, sigma=2.0)

        max_count = float(np.max(grid))
        grid_normalized = (grid / max_count * 255).astype(np.uint8).tolist() if max_count > 0 else []

        return {
            "grid": grid_normalized,
            "max_count": int(max_count),
            "total_samples": len(all_samples),
            "field_width": float(max_x - min_x),
            "field_length": float(max_y - min_y),
            "origin_x": float(min_x),
            "origin_y": float(min_y),
            "grid_size": self.grid_size,
        }
