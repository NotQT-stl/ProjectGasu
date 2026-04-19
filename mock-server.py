"""
mock-server.py — AeroGuard Python Mock Sensor API
==========================================================
Simulates the exact JSON shape a Raspberry Pi backend returns.
Zero dependencies beyond Python 3's standard library.

USAGE:
    python mock-server.py

Then in sensorManager.js set:
    const MOCK_MODE = false;
    const API_URL   = 'http://localhost:5000/api/sensor';
"""

import json
import math
import random
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 5000

# Shared random-walk state — gradual drift mirrors sensorManager.js mock
state = {"pm25": 18.0, "co2": 420.0, "voc": 120.0}


def next_reading():
    """Advance the random walk one step and return a sensor reading dict."""
    state["pm25"] = max(1.0,   min(300.0,  state["pm25"] + (random.random() - 0.48) * 3))
    state["co2"]  = max(350.0, min(3000.0, state["co2"]  + (random.random() - 0.48) * 15))
    state["voc"]  = max(0.0,   min(1000.0, state["voc"]  + (random.random() - 0.48) * 8))

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "pm25":      round(state["pm25"], 1),
        "co2":       round(state["co2"]),
        "voc":       round(state["voc"]),
        # aqi is intentionally omitted — sensorManager.js computes it
    }


class SensorHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/sensor":
            body = json.dumps(next_reading()).encode()
            self.send_response(200)
            self.send_header("Content-Type",  "application/json")
            self.send_header("Content-Length", str(len(body)))
            # Allow cross-origin requests from the frontend
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    # Suppress default per-request log noise (keep terminal clean during demo)
    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), SensorHandler)
    print(f"AeroGuard mock sensor API running at http://localhost:{PORT}/api/sensor")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
