#!/bin/bash
# Start FRC Motion Coach in development mode

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting FRC Motion Coach..."
echo "Root directory: $ROOT_DIR"

cd "$ROOT_DIR/backend" || exit 1

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "Starting backend server on http://localhost:8000"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &

BACKEND_PID=$!

cd "$ROOT_DIR/frontend" || exit 1

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "Starting frontend dev server on http://localhost:5173"
npm run dev &

FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
