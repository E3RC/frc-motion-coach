# Setup Guide

## Requirements

- Python 3.10+
- Node.js 18+
- USB webcam or built-in laptop camera
- AprilTags or ArUco markers (printed on paper)

## Camera Placement

For best results:

- Mount the camera as high as possible, looking down at the field
- Keep the entire practice area visible in the frame
- Avoid direct glare from lights or windows
- Use stable, even lighting
- The camera can be angled — the calibration will correct for perspective

## Marker Placement

- Print a 6x6 ArUco marker on paper (use `aruco_marker.pdf` generator or `gen_pattern.py` from OpenCV examples)
- Mount the marker flat on top of the robot
- Avoid placing it where mechanisms (intake, arm, elevator) will occlude it
- Measure the offset from marker center to robot center for best accuracy

## Running the Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000
Interactive API docs at http://localhost:8000/docs

## Running the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be available at http://localhost:5173

## Verify It Works

1. Open http://localhost:5173
2. Check the top bar shows "Connected to backend"
3. Go to Calibration to set up your field
4. Go to Live Dashboard, select a practice type, and start tracking
