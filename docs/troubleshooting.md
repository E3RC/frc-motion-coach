# Troubleshooting Guide

## Camera Not Found

- Check the camera is connected and not in use by another app
- Try a different USB port
- On Windows, check Camera privacy settings in System Settings
- Run `python -c "import cv2; cap = cv2.VideoCapture(0); print(cap.isOpened())"` to test

## Calibration Fails

- Ensure at least 4 markers or corners are visible
- Markers must not be all in a straight line
- Good lighting helps detection
- If using ArUco, print markers at reasonable size (at least 4 inches)
- Try manual corner selection if automatic detection fails

## Tracking Lost

- Robot marker is occluded — change mounting position
- Lighting changed — markers need good contrast
- Robot left the camera's field of view
- Camera was moved — re-calibrate

## Poor Accuracy

- Camera too far from the field
- Camera angle too shallow (not looking down enough)
- Calibration points don't cover the whole practice area
- Marker too small in the frame
- Lens distortion — use a camera with less distortion if possible

## Dashboard Not Connecting

- Is the backend running? Check http://localhost:8000/api/status
- Are both servers running? Backend on :8000, frontend on :5173
- Check for CORS errors in browser developer tools (F12)

## Database Issues

- Delete `data/frc_motion_coach.db` to reset
- The database is recreated on startup if missing
- Back up the data directory before updates

## Known Limitations (MVP)

- Single robot tracking only
- No video recording with overlay yet
- No automatic camera calibration (lens distortion not corrected)
- No NetworkTables integration yet
- Tracking accuracy depends on marker quality and lighting
