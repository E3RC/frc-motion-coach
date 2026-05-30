"""
Generate a simulated robot run with known metrics for testing.
Outputs JSON and optionally writes to the database.
"""
import json
import math
import time
import argparse
import random
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.metrics.calculator import MetricsCalculator, MetricsConfig
from app.storage.database import Database


def generate_circle_path(
    duration_s: float = 30.0,
    fps: float = 30.0,
    radius_ft: float = 5.0,
    center_x: float = 13.5,
    center_y: float = 13.5,
    speed_ft_per_s: float = 3.0,
    noise: float = 0.05,
) -> list[dict]:
    samples = []
    dt = 1.0 / fps
    num_samples = int(duration_s * fps)
    circumference = 2 * math.pi * radius_ft
    angular_velocity = speed_ft_per_s / radius_ft

    for i in range(num_samples):
        t = i * dt
        angle = angular_velocity * t
        x = center_x + radius_ft * math.cos(angle) + random.uniform(-noise, noise)
        y = center_y + radius_ft * math.sin(angle) + random.uniform(-noise, noise)
        samples.append({"timestamp": t, "field_x": x, "field_y": y, "confidence": 0.95})

    return samples


def generate_straight_path(
    duration_s: float = 20.0,
    fps: float = 30.0,
    start_x: float = 0.0,
    start_y: float = 0.0,
    end_x: float = 20.0,
    end_y: float = 20.0,
    pause_at_start: float = 2.0,
    pause_at_end: float = 3.0,
    noise: float = 0.05,
) -> list[dict]:
    samples = []
    dt = 1.0 / fps

    for i in range(int(pause_at_start * fps)):
        samples.append({"timestamp": i * dt, "field_x": start_x, "field_y": start_y, "confidence": 0.95})

    travel_time = duration_s - pause_at_start - pause_at_end
    start_idx = len(samples)
    for i in range(int(travel_time * fps)):
        frac = i / (travel_time * fps)
        t = (start_idx + i) * dt
        x = start_x + (end_x - start_x) * frac + random.uniform(-noise, noise)
        y = start_y + (end_y - start_y) * frac + random.uniform(-noise, noise)
        samples.append({"timestamp": t, "field_x": x, "field_y": y, "confidence": 0.95})

    final_idx = len(samples)
    for i in range(int(pause_at_end * fps)):
        t = (final_idx + i) * dt
        samples.append({"timestamp": t, "field_x": end_x, "field_y": end_y, "confidence": 0.95})

    return samples


def generate_stop_start_path(
    duration_s: float = 30.0,
    fps: float = 30.0,
    noise: float = 0.05,
) -> list[dict]:
    samples = []
    dt = 1.0 / fps
    segments = [
        (0.0, 0.0, 10.0, 0.0, 4.0),
        (10.0, 0.0, 10.0, 2.0),
        (10.0, 2.0, 0.0, 2.0, 3.0),
        (0.0, 2.0, 0.0, 4.0),
        (0.0, 4.0, 10.0, 4.0, 4.0),
    ]

    t = 0.0
    for seg in segments:
        if len(seg) == 4:
            sx, sy, ex, ey = seg
            pause = 1.0
        else:
            sx, sy, ex, ey, pause = seg

        dist = math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2)
        speed = 5.0
        travel_time = dist / speed if speed > 0 else 0.1
        num_steps = int(travel_time * fps)

        for i in range(num_steps):
            frac = i / num_steps if num_steps > 0 else 0
            x = sx + (ex - sx) * frac + random.uniform(-noise, noise)
            y = sy + (ey - sy) * frac + random.uniform(-noise, noise)
            samples.append({"timestamp": t, "field_x": x, "field_y": y, "confidence": 0.95})
            t += dt

        for i in range(int(pause * fps)):
            samples.append({"timestamp": t, "field_x": ex, "field_y": ey, "confidence": 0.95})
            t += dt

    return samples


def process_samples(samples: list[dict], save_to_db: bool = False, run_name: str = "Fake Run"):
    config = MetricsConfig(
        moving_threshold_ft_per_s=0.25,
        moving_min_duration_s=0.25,
        stopped_threshold_ft_per_s=0.15,
        stopped_min_duration_s=0.5,
    )
    calc = MetricsCalculator(config)

    for s in samples:
        calc.add_sample(s["timestamp"], s["field_x"], s["field_y"], s.get("confidence", 0.95))

    summary = calc.compute_summary()

    result = {
        "run_name": run_name,
        "num_samples": len(samples),
        "summary": {
            "duration_s": round(summary.duration_s, 3),
            "max_speed_ft_per_s": round(summary.max_speed_ft_per_s, 3),
            "avg_moving_speed_ft_per_s": round(summary.avg_moving_speed_ft_per_s, 3),
            "peak_estimated_g": round(summary.peak_estimated_g, 5),
            "total_distance_ft": round(summary.total_distance_ft, 3),
            "time_moving_s": round(summary.time_moving_s, 3),
            "time_stopped_s": round(summary.time_stopped_s, 3),
            "time_unknown_s": round(summary.time_unknown_s, 3),
            "num_stop_start_events": summary.num_stop_start_events,
            "sample_count": summary.sample_count,
            "moving_sample_count": summary.moving_sample_count,
        },
    }

    if save_to_db:
        db_path = os.path.join(os.path.dirname(__file__), "..", "data", "frc_motion_coach.db")
        db = Database(db_path)
        run_id = db.save_run({
            "name": run_name,
            "summary_metrics_json": result["summary"],
        })
        db_samples = [
            {
                "run_id": run_id,
                "timestamp": s["timestamp"],
                "frame_number": i,
                "field_x": s["field_x"],
                "field_y": s["field_y"],
                "speed": calc.samples[i].speed if i < len(calc.samples) else 0,
                "acceleration": calc.samples[i].acceleration if i < len(calc.samples) else 0,
                "estimated_g": calc.samples[i].estimated_g if i < len(calc.samples) else 0,
                "confidence": s.get("confidence", 0.95),
                "state": calc.samples[i].state.value if i < len(calc.samples) else "unknown",
            }
            for i, s in enumerate(samples)
        ]
        db.save_samples(db_samples)
        result["db_run_id"] = run_id

    return result


def verify_expected_values(result: dict, expected: dict) -> list[str]:
    issues = []
    summary = result["summary"]

    checks = [
        ("max_speed_ft_per_s", "max speed"),
        ("total_distance_ft", "total distance"),
        ("time_moving_s", "moving time"),
        ("time_stopped_s", "stopped time"),
    ]

    for key, label in checks:
        if key in expected:
            actual = summary.get(key, 0)
            expected_val = expected[key]
            if actual < expected_val * 0.5 or actual > expected_val * 1.5:
                issues.append(f"{label}: expected ~{expected_val}, got {actual}")

    if summary["duration_s"] <= 0:
        issues.append("Duration should be positive")

    return issues


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate fake robot run")
    parser.add_argument("--type", choices=["circle", "straight", "stopstart"], default="circle")
    parser.add_argument("--duration", type=float, default=30.0)
    parser.add_argument("--save-db", action="store_true")
    parser.add_argument("--output", type=str, default="")
    args = parser.parse_args()

    if args.type == "circle":
        samples = generate_circle_path(duration_s=args.duration)
        expected = {"max_speed_ft_per_s": 3.0, "total_distance_ft": 3.0 * args.duration}
    elif args.type == "straight":
        samples = generate_straight_path(duration_s=args.duration)
        expected = {"total_distance_ft": math.sqrt(20**2 + 20**2)}
    else:
        samples = generate_stop_start_path(duration_s=args.duration)
        expected = {}

    result = process_samples(samples, save_to_db=args.save_db, run_name=f"Fake {args.type} run")
    issues = verify_expected_values(result, expected)

    print(json.dumps(result, indent=2))
    print(f"\nExpected: {json.dumps(expected, indent=2)}")

    if issues:
        print(f"\nVerification issues ({len(issues)}):")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\nAll checks passed")

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
