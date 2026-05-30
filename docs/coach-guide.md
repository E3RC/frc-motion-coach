# Coach Usage Guide

## Getting Started

1. Make sure the laptop is on and connected to the camera
2. Open Chrome/Firefox and go to http://localhost:5173
3. You should see "Connected to backend" in the top bar

## Calibration (First Time)

1. Click **Calibration** in the top nav
2. Select your camera
3. Choose **Half Field** (most common for practice)
4. Place an ArUco marker at each corner of the practice area
5. The system will detect them — confirm the mapping
6. Save the calibration profile with a name like "Tuesday Practice"

This only needs to be done once per camera position.

## Recording a Run

1. Click **Live Dashboard**
2. Select the practice type (Driver Practice, Auto Routine, etc.)
3. Enter the driver's name (optional)
4. Click **Start Camera Tracking** to begin seeing the camera feed
5. Click **Start Recording Run** to begin saving data
6. Have the driver run their practice routine
7. When done, click **Stop Recording Run**
8. The run is automatically saved

## Live Dashboard

While tracking, you can see:

- **Speed** (current and max)
- **Estimated G-Force**
- **Acceleration**
- **Distance traveled** this run
- **Moving time** and **Stopped time**
- **Confidence** — how reliably the robot is detected
- **Field view** — robot position and path trail

If confidence drops, check:
- Is the marker visible from the camera?
- Is lighting causing glare or shadows?

## Reviewing Past Runs

1. Click **History** in the top nav
2. All saved runs are listed with key stats
3. Click any run to see detailed charts and path replay
4. Use the play button to replay the robot's path
5. Export as CSV or JSON for analysis in other tools

## Understanding the Data

- **Speed**: feet per second (ft/s). Multiply by 0.682 for mph.
- **Estimated G-Force**: acceleration divided by 32.174 ft/s². This is an estimate, not a certified measurement.
- **Moving/Stopped**: based on speed thresholds. Configurable in settings.
- **Confidence**: 0-100%. Higher is better. Below 50% means tracking is uncertain.

## Tips

- Make sure the robot's tracking marker is clearly visible before starting a run
- Avoid having people or other robots between the camera and the tracked robot
- For best G-force estimates, use a marker that stays flat and stable on the robot
- Compare driver practice runs to see improvement over time
- Export data for team analysis or driver coaching sessions
