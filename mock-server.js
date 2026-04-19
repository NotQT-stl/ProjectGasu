// ============================================================
// mock-server.js — Minimal Express API Mock
//
// Simulates the exact JSON shape your Raspberry Pi backend
// must return. Use this to test the live-API path before
// your Pi is ready.
//
// SETUP:
//   npm install express
//   node mock-server.js
//
// Then in sensorManager.js:
//   const MOCK_MODE = false;
//   const API_URL   = 'http://localhost:5000/api/sensor';
//
// On your actual Pi, replicate this endpoint reading from your
// sensor library (e.g. pms5003, MH-Z19, SGP30) and return the
// same JSON shape. Zero other frontend changes needed.
// ============================================================

const express = require('express');
const app     = express();
const PORT    = 5000;

// Allow requests from the frontend (CORS)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Internal random-walk state (mirrors sensorManager.js mock for consistency)
let state = { pm25: 18.0, co2: 420, voc: 120 };

// GET /api/sensor — returns one reading in the canonical AeroGuard JSON shape
app.get('/api/sensor', (req, res) => {
  // Advance the random walk one step
  state.pm25 = Math.max(1,    Math.min(300,  state.pm25 + (Math.random() - 0.48) * 3));
  state.co2  = Math.max(350,  Math.min(3000, state.co2  + (Math.random() - 0.48) * 15));
  state.voc  = Math.max(0,    Math.min(1000, state.voc  + (Math.random() - 0.48) * 8));

  // This is the exact shape sensorManager.js#normalize() expects.
  // Your Pi script must return at minimum: { timestamp, pm25, co2, voc }
  res.json({
    timestamp: new Date().toISOString(),
    pm25:      +state.pm25.toFixed(1),
    co2:       Math.round(state.co2),
    voc:       Math.round(state.voc),
    // aqi is optional — sensorManager will compute it if absent
  });
});

app.listen(PORT, () => {
  console.log(`✅  AeroGuard mock sensor API running at http://localhost:${PORT}/api/sensor`);
  console.log(`    Press Ctrl+C to stop.`);
});
