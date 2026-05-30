import json
import os
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class AppSettings:
    camera_id: int = 0
    camera_resolution_width: int = 1280
    camera_resolution_height: int = 720
    tracking_mode: str = "aruco"
    target_marker_id: int = 0
    marker_offset_x: float = 0.0
    marker_offset_y: float = 0.0
    moving_threshold_ft_per_s: float = 0.25
    moving_min_duration_s: float = 0.25
    stopped_threshold_ft_per_s: float = 0.15
    stopped_min_duration_s: float = 0.5
    tracking_lost_timeout_s: float = 0.5
    smoothing_window: int = 5
    color_lower_h: int = 0
    color_lower_s: int = 100
    color_lower_v: int = 100
    color_upper_h: int = 10
    color_upper_s: int = 255
    color_upper_v: int = 255

    _file_path: str = ""

    def save(self):
        data = asdict(self)
        data.pop("_file_path", None)
        with open(self._file_path, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, file_path: str) -> "AppSettings":
        settings = cls(_file_path=file_path)
        if os.path.exists(file_path):
            with open(file_path) as f:
                data = json.load(f)
                for key, value in data.items():
                    if hasattr(settings, key):
                        setattr(settings, key, value)
        return settings
