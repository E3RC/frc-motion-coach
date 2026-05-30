import pytest
import numpy as np
from app.tracking.tracker import Tracker, TrackingMode


class TestTracker:
    def setup_method(self):
        self.tracker = Tracker()

    def test_default_mode(self):
        assert self.tracker.mode == TrackingMode.ARUCO

    def test_set_color_range(self):
        self.tracker.set_color_range((0, 0, 0), (180, 255, 255))
        assert self.tracker.color_range.lower == (0, 0, 0)
        assert self.tracker.color_range.upper == (180, 255, 255)

    def test_set_marker_offset(self):
        self.tracker.set_marker_offset(8.0, 2.0)
        assert self.tracker.marker_offset_x == 8.0
        assert self.tracker.marker_offset_y == 2.0
