import cv2
import numpy as np
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Optional


class FieldType(str, Enum):
    FULL_FIELD = "full_field"
    HALF_FIELD = "half_field"
    CUSTOM = "custom"


FIELD_DIMENSIONS = {
    FieldType.FULL_FIELD: (54.0, 27.0),
    FieldType.HALF_FIELD: (27.0, 27.0),
}


@dataclass
class CalibrationResult:
    success: bool
    homography_matrix: Optional[np.ndarray] = None
    error_message: str = ""
    reprojection_error: float = 0.0
    field_width: float = 27.0
    field_length: float = 54.0


class Calibrator:
    def __init__(self):
        self.aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
        self.aruco_params = cv2.aruco.DetectorParameters()
        self.detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.aruco_params)

    def detect_aruco_markers(self, frame: np.ndarray) -> list[tuple[int, np.ndarray]]:
        corners, ids, _ = self.detector.detectMarkers(frame)
        results = []
        if ids is not None:
            for i, marker_id in enumerate(ids.flatten()):
                center = np.mean(corners[i][0], axis=0)
                results.append((int(marker_id), center))
        return results

    def calibrate_from_points(
        self,
        image_points: list[tuple[float, float]],
        field_points: list[tuple[float, float]],
        field_width: float = 27.0,
        field_length: float = 54.0,
    ) -> CalibrationResult:
        if len(image_points) < 4:
            return CalibrationResult(
                success=False,
                error_message="Need at least 4 point correspondences",
            )

        src_pts = np.array(image_points, dtype=np.float32)
        dst_pts = np.array(field_points, dtype=np.float32)

        H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        if H is None:
            return CalibrationResult(
                success=False,
                error_message="Homography could not be computed. Points may be degenerate.",
            )

        projected = cv2.perspectiveTransform(src_pts.reshape(-1, 1, 2), H)
        errors = np.sqrt(np.sum((projected.reshape(-1, 2) - dst_pts) ** 2, axis=1))
        reproj_error = float(np.mean(errors))

        return CalibrationResult(
            success=True,
            homography_matrix=H,
            reprojection_error=reproj_error,
            field_width=field_width,
            field_length=field_length,
        )

    def calibrate_from_aruco(
        self,
        frame: np.ndarray,
        marker_map: dict[int, tuple[float, float]],
        field_width: float = 27.0,
        field_length: float = 54.0,
    ) -> CalibrationResult:
        detected = self.detect_aruco_markers(frame)
        image_pts = []
        field_pts = []

        for marker_id, center in detected:
            if marker_id in marker_map:
                image_pts.append(tuple(center))
                field_pts.append(marker_map[marker_id])

        if len(image_pts) < 4:
            return CalibrationResult(
                success=False,
                error_message=f"Only {len(image_pts)} markers matched (need 4)",
            )

        return self.calibrate_from_points(
            image_pts, field_pts, field_width, field_length
        )

    def warp_field(self, frame: np.ndarray, H: np.ndarray, field_width: float, field_length: float) -> np.ndarray:
        h, w = frame.shape[:2]
        dst_size = (int(field_length * 10), int(field_width * 10))
        return cv2.warpPerspective(frame, H, dst_size)

    def transform_point(self, pixel_x: float, pixel_y: float, H: np.ndarray) -> tuple[float, float]:
        pt = np.array([[[pixel_x, pixel_y]]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(pt, H)
        return float(transformed[0][0][0]), float(transformed[0][0][1])
