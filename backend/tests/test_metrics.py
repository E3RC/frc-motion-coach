import pytest
import math
from app.metrics.calculator import MetricsCalculator, MetricsConfig, RobotState


class TestMetricsCalculator:
    def setup_method(self):
        config = MetricsConfig(
            moving_threshold_ft_per_s=0.25,
            moving_min_duration_s=0.1,
            stopped_threshold_ft_per_s=0.15,
            stopped_min_duration_s=0.1,
        )
        self.calc = MetricsCalculator(config)

    def test_basic_motion(self):
        t = 0.0
        for i in range(100):
            x = i * 0.1
            y = 0.0
            self.calc.add_sample(t, x, y, 1.0)
            t += 1.0 / 30.0

        summary = self.calc.compute_summary()
        assert summary.sample_count == 100
        assert summary.max_speed_ft_per_s > 0
        assert summary.total_distance_ft > 0

    def test_stationary(self):
        for i in range(90):
            self.calc.add_sample(i / 30.0, 0.0, 0.0, 1.0)

        summary = self.calc.compute_summary()
        assert summary.max_speed_ft_per_s == 0.0
        assert summary.total_distance_ft == 0.0
        assert summary.time_moving_s == 0.0

    def test_speed_calculation(self):
        fps = 30.0
        speed_ft_per_s = 5.0
        dt = 1.0 / fps

        x = 0.0
        for i in range(30):
            sample = self.calc.add_sample(i * dt, x, 0.0, 1.0)
            x += speed_ft_per_s * dt

        speeds = [s.speed for s in self.calc.samples[5:]]
        avg_speed = sum(speeds) / len(speeds) if speeds else 0
        assert abs(avg_speed - speed_ft_per_s) < 1.0

    def test_acceleration_sign(self):
        fps = 30.0
        dt = 1.0 / fps

        for i in range(20):
            self.calc.add_sample(i * dt, i * 0.5, 0.0, 1.0)

        for i in range(20, 40):
            self.calc.add_sample(i * dt, 10.0 - (i - 20) * 0.3, 0.0, 1.0)

        accelerations = [s.acceleration for s in self.calc.samples[5:] if s.acceleration != 0]
        has_positive = any(a > 0.1 for a in accelerations)
        has_negative = any(a < -0.1 for a in accelerations)
        assert has_positive or has_negative

    def test_g_force_estimate(self):
        g = 32.174
        fps = 30.0
        dt = 1.0 / fps

        x = 0.0
        v = 0.0
        accel = 10.0
        for i in range(30):
            sample = self.calc.add_sample(i * dt, x, 0.0, 1.0)
            v += accel * dt
            x += v * dt

        max_g = max(abs(s.estimated_g) for s in self.calc.samples)
        assert max_g > 0

    def test_distance_accumulation(self):
        for i in range(30):
            self.calc.add_sample(i / 30.0, i * 0.5, 0.0, 1.0)

        summary = self.calc.compute_summary()
        assert abs(summary.total_distance_ft - 14.5) < 0.5

    def test_state_classification_moving(self):
        config = MetricsConfig(
            moving_threshold_ft_per_s=0.25,
            moving_min_duration_s=0.1,
            stopped_threshold_ft_per_s=0.15,
            stopped_min_duration_s=0.1,
        )
        calc = MetricsCalculator(config)
        fps = 30.0

        for i in range(60):
            calc.add_sample(i / fps, i * 0.1, 0.0, 1.0)

        moving_count = sum(1 for s in calc.samples if s.state == RobotState.MOVING)
        assert moving_count > 30

    def test_state_classification_stopped(self):
        config = MetricsConfig(
            moving_threshold_ft_per_s=0.25,
            moving_min_duration_s=0.1,
            stopped_threshold_ft_per_s=0.15,
            stopped_min_duration_s=0.1,
        )
        calc = MetricsCalculator(config)
        fps = 30.0

        for i in range(30):
            calc.add_sample(i / fps, i * 0.1, 0.0, 1.0)
        for i in range(30, 90):
            calc.add_sample(i / fps, 3.0, 0.0, 1.0)

        stopped_count = sum(1 for s in calc.samples if s.state == RobotState.STOPPED)
        assert stopped_count > 20

    def test_empty_run(self):
        summary = self.calc.compute_summary()
        assert summary.duration_s == 0.0
        assert summary.sample_count == 0

    def test_single_sample(self):
        self.calc.add_sample(0.0, 1.0, 2.0, 1.0)
        summary = self.calc.compute_summary()
        assert summary.sample_count == 1
