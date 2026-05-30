# Calibration Guide

## Overview

Calibration maps camera pixel coordinates to real-world field coordinates using a homography transform. This corrects for camera angle, lens distortion, and position.

## Methods

### Method 1: AprilTag / ArUco Markers (Recommended)

1. Place markers at known field corners or reference points
2. The system detects them automatically
3. You confirm the mapping matches expected field positions

Marker IDs and their field positions should be configured before calibration.

### Method 2: Manual Corner Selection (Fallback)

1. View the camera feed
2. Click on each field corner in order
3. Enter the corresponding real-world coordinates
4. The system computes the homography

## Calibration Workflow

1. **Select Camera** — Choose from detected cameras
2. **Field Setup** — Select full field, half field, or custom dimensions
3. **Calibrate** — The system detects markers or you click corners
4. **Preview** — Check the top-down field view looks correct
5. **Save** — Name and save the calibration profile

## Quality Checks

The system warns if:

- Fewer than 4 point correspondences are detected
- Points are degenerate (all the same, or collinear)
- Reprojection error is high (points don't map cleanly)
- Camera resolution changes between calibration and tracking

## Tips

- Use high-contrast markers printed on matte paper
- Ensure the entire practice area is bounded by visible markers
- Re-calibrate if you move the camera
- Save calibration profiles for repeat setups
- Test with a known path (e.g., walk a marker across the field) to verify accuracy
