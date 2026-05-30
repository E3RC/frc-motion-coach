import pytest
import numpy as np
from app.calibration.calibrator import Calibrator, CalibrationResult


class TestCalibrator:
    def setup_method(self):
        self.calibrator = Calibrator()

    def test_calibrate_from_points_simple_grid(self):
        image_pts = [(100, 100), (300, 100), (300, 300), (100, 300)]
        field_pts = [(0, 0), (27, 0), (27, 27), (0, 27)]

        result = self.calibrator.calibrate_from_points(image_pts, field_pts)
        assert result.success
        assert result.homography_matrix is not None
        assert result.reprojection_error < 1.0

    def test_calibrate_from_points_insufficient(self):
        result = self.calibrator.calibrate_from_points([(0, 0), (1, 1), (2, 2)], [(0, 0), (27, 0), (27, 27)])
        assert not result.success
        assert "4 point" in result.error_message

    def test_transform_point(self):
        image_pts = [(100, 100), (300, 100), (300, 300), (100, 300)]
        field_pts = [(0, 0), (27, 0), (27, 27), (0, 27)]

        result = self.calibrator.calibrate_from_points(image_pts, field_pts)
        fx, fy = self.calibrator.transform_point(100, 100, result.homography_matrix)
        assert abs(fx) < 1.0
        assert abs(fy) < 1.0

    def test_transform_point_center(self):
        image_pts = [(0, 0), (200, 0), (200, 200), (0, 200)]
        field_pts = [(0, 0), (10, 0), (10, 10), (0, 10)]

        result = self.calibrator.calibrate_from_points(image_pts, field_pts)
        fx, fy = self.calibrator.transform_point(100, 100, result.homography_matrix)
        assert 4.5 < fx < 5.5
        assert 4.5 < fy < 5.5

    def test_homography_preserves_straight_lines(self):
        image_pts = [(100, 200), (200, 200), (200, 300), (100, 300)]
        field_pts = [(0, 0), (10, 0), (10, 10), (0, 10)]

        result = self.calibrator.calibrate_from_points(image_pts, field_pts)
        H = result.homography_matrix

        p1 = self.calibrator.transform_point(100, 200, H)
        p2 = self.calibrator.transform_point(150, 200, H)
        p3 = self.calibrator.transform_point(200, 200, H)

        assert abs(p2[1] - p1[1]) < 0.01
        assert abs(p3[1] - p1[1]) < 0.01


class TestCalibrationEdgeCases:
    def setup_method(self):
        self.calibrator = Calibrator()

    def test_degenerate_points(self):
        image_pts = [(0, 0), (0, 0), (0, 0), (0, 0)]
        field_pts = [(0, 0), (27, 0), (27, 27), (0, 27)]

        result = self.calibrator.calibrate_from_points(image_pts, field_pts)
        assert not result.success

    def test_non_rectangular_field(self):
        image_pts = [(100, 100), (400, 120), (380, 350), (80, 330)]
        field_pts = [(0, 0), (20, 0), (20, 15), (0, 15)]

        result = self.calibrator.calibrate_from_points(image_pts, field_pts)
        assert result.success
