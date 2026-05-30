import cv2
import numpy as np
from enum import Enum
from dataclasses import dataclass
from typing import Optional


class TrackingMode(str, Enum):
    ARUCO = "aruco"
    COLOR = "color"


class RobotState(str, Enum):
    MOVING = "moving"
    STOPPED = "stopped"
    UNKNOWN = "unknown"


@dataclass
class TrackingResult:
    success: bool
    pixel_x: float = 0.0
    pixel_y: float = 0.0
    confidence: float = 0.0
    marker_id: Optional[int] = None
    error_message: str = ""


@dataclass
class ColorRange:
    lower: tuple[int, int, int]
    upper: tuple[int, int, int]


class Tracker:
    def __init__(self):
        self.aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_6X6_250)
        self.aruco_params = cv2.aruco.DetectorParameters()
        self.detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.aruco_params)
        self.mode = TrackingMode.ARUCO
        self.color_range = ColorRange(lower=(0, 100, 100), upper=(10, 255, 255))
        self.marker_offset_x = 0.0
        self.marker_offset_y = 0.0
        self.min_contour_area = 500

    def set_color_range(self, lower: tuple[int, int, int], upper: tuple[int, int, int]):
        self.color_range = ColorRange(lower=lower, upper=upper)

    def set_marker_offset(self, x: float, y: float):
        self.marker_offset_x = x
        self.marker_offset_y = y

    def track_aruco(self, frame: np.ndarray, target_id: Optional[int] = None) -> TrackingResult:
        corners, ids, _ = self.detector.detectMarkers(frame)
        if ids is None or len(ids) == 0:
            return TrackingResult(success=False, error_message="No markers detected")

        for i, marker_id in enumerate(ids.flatten()):
            if target_id is not None and int(marker_id) != target_id:
                continue
            center = np.mean(corners[i][0], axis=0)
            return TrackingResult(
                success=True,
                pixel_x=float(center[0]),
                pixel_y=float(center[1]),
                confidence=0.95,
                marker_id=int(marker_id),
            )

        return TrackingResult(success=False, error_message="Target marker not found")

    def track_color(self, frame: np.ndarray) -> TrackingResult:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, self.color_range.lower, self.color_range.upper)
        mask = cv2.erode(mask, None, iterations=2)
        mask = cv2.dilate(mask, None, iterations=2)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return TrackingResult(success=False, error_message="No color match found")

        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        if area < self.min_contour_area:
            return TrackingResult(success=False, error_message="Contour too small")

        M = cv2.moments(largest)
        if M["m00"] == 0:
            return TrackingResult(success=False, error_message="Zero moment")

        cx = float(M["m10"] / M["m00"])
        cy = float(M["m01"] / M["m00"])
        confidence = min(1.0, area / 5000.0)

        return TrackingResult(success=True, pixel_x=cx, pixel_y=cy, confidence=confidence)

    def track(self, frame: np.ndarray, target_id: Optional[int] = None) -> TrackingResult:
        if self.mode == TrackingMode.ARUCO:
            result = self.track_aruco(frame, target_id)
        else:
            result = self.track_color(frame)

        if result.success:
            result.pixel_x += self.marker_offset_x
            result.pixel_y += self.marker_offset_y

        return result
