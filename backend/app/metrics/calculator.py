import math
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from ..tracking.tracker import RobotState


@dataclass
class MetricsConfig:
    moving_threshold_ft_per_s: float = 0.25
    moving_min_duration_s: float = 0.25
    stopped_threshold_ft_per_s: float = 0.15
    stopped_min_duration_s: float = 0.5
    tracking_lost_timeout_s: float = 0.5
    smoothing_window: int = 5
    g_force_estimate_label: str = "estimated"


@dataclass
class Sample:
    timestamp: float
    field_x: float
    field_y: float
    confidence: float
    state: RobotState = RobotState.UNKNOWN
    speed: float = 0.0
    acceleration: float = 0.0
    estimated_g: float = 0.0
    distance_delta: float = 0.0


@dataclass
class RunSummary:
    duration_s: float = 0.0
    max_speed_ft_per_s: float = 0.0
    avg_moving_speed_ft_per_s: float = 0.0
    peak_estimated_g: float = 0.0
    total_distance_ft: float = 0.0
    time_moving_s: float = 0.0
    time_stopped_s: float = 0.0
    time_unknown_s: float = 0.0
    num_stop_start_events: int = 0
    sample_count: int = 0
    moving_sample_count: int = 0


class MetricsCalculator:
    GRAVITY_FT_PER_S2 = 32.174

    def __init__(self, config: Optional[MetricsConfig] = None):
        self.config = config or MetricsConfig()
        self.samples: list[Sample] = []
        self._prev_sample: Optional[Sample] = None
        self._speed_buffer: list[float] = []
        self._consecutive_stopped = 0
        self._consecutive_moving = 0
        self._was_moving = False
        self._stop_start_count = 0

    def reset(self):
        self.samples.clear()
        self._prev_sample = None
        self._speed_buffer.clear()
        self._consecutive_stopped = 0
        self._consecutive_moving = 0
        self._was_moving = False
        self._stop_start_count = 0

    def add_sample(
        self,
        timestamp: float,
        field_x: float,
        field_y: float,
        confidence: float,
    ) -> Sample:
        sample = Sample(
            timestamp=timestamp,
            field_x=field_x,
            field_y=field_y,
            confidence=confidence,
        )

        if self._prev_sample is not None:
            dt = sample.timestamp - self._prev_sample.timestamp
            if dt > 0:
                dx = sample.field_x - self._prev_sample.field_x
                dy = sample.field_y - self._prev_sample.field_y
                sample.distance_delta = math.sqrt(dx**2 + dy**2)
                sample.speed = sample.distance_delta / dt

                if len(self._speed_buffer) >= 2:
                    prev_speed = self._speed_buffer[-1]
                    sample.acceleration = (sample.speed - prev_speed) / dt
                    sample.estimated_g = sample.acceleration / self.GRAVITY_FT_PER_S2

        self._speed_buffer.append(sample.speed)
        if len(self._speed_buffer) > self.config.smoothing_window:
            self._speed_buffer.pop(0)

        sample.state = self._classify_state(sample.speed)
        self.samples.append(sample)
        self._prev_sample = sample
        return sample

    def _classify_state(self, speed: float) -> RobotState:
        if speed > self.config.moving_threshold_ft_per_s:
            self._consecutive_moving += 1
            self._consecutive_stopped = 0
            if self._consecutive_moving >= max(1, int(self.config.moving_min_duration_s * 30)):
                if not self._was_moving:
                    self._stop_start_count += 1
                self._was_moving = True
                return RobotState.MOVING
        elif speed < self.config.stopped_threshold_ft_per_s:
            self._consecutive_stopped += 1
            self._consecutive_moving = 0
            if self._consecutive_stopped >= max(1, int(self.config.stopped_min_duration_s * 30)):
                self._was_moving = False
                return RobotState.STOPPED
        else:
            self._consecutive_moving = 0
            self._consecutive_stopped = 0

        if self._was_moving:
            self._consecutive_moving += 1
            return RobotState.MOVING
        return RobotState.STOPPED

    def compute_summary(self) -> RunSummary:
        if not self.samples:
            return RunSummary()

        moving_speeds = []
        total_moving = 0.0
        total_stopped = 0.0
        total_unknown = 0.0
        total_dist = 0.0
        peak_g = 0.0

        for s in self.samples:
            total_dist += s.distance_delta
            peak_g = max(peak_g, abs(s.estimated_g))
            if s.state == RobotState.MOVING:
                moving_speeds.append(s.speed)
                total_moving += 1
            elif s.state == RobotState.STOPPED:
                total_stopped += 1
            else:
                total_unknown += 1

        dt_per_sample = 1.0 / 30.0
        if len(self.samples) > 1:
            dt_per_sample = (self.samples[-1].timestamp - self.samples[0].timestamp) / len(self.samples)

        duration = self.samples[-1].timestamp - self.samples[0].timestamp if len(self.samples) > 1 else 0.0

        return RunSummary(
            duration_s=duration,
            max_speed_ft_per_s=max(s.speed for s in self.samples),
            avg_moving_speed_ft_per_s=(
                sum(moving_speeds) / len(moving_speeds) if moving_speeds else 0.0
            ),
            peak_estimated_g=peak_g,
            total_distance_ft=total_dist,
            time_moving_s=total_moving * dt_per_sample,
            time_stopped_s=total_stopped * dt_per_sample,
            time_unknown_s=total_unknown * dt_per_sample,
            num_stop_start_events=self._stop_start_count,
            sample_count=len(self.samples),
            moving_sample_count=len(moving_speeds),
        )
