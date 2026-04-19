const API_URL          = 'http://192.168.4.1:5000/latest';
const POLL_INTERVAL_MS = 3000;

const AQI_BREAKPOINTS = [
  { pm_lo: 0.0,   pm_hi: 12.0,  aqi_lo: 0,   aqi_hi: 50  },
  { pm_lo: 12.1,  pm_hi: 35.4,  aqi_lo: 51,  aqi_hi: 100 },
  { pm_lo: 35.5,  pm_hi: 55.4,  aqi_lo: 101, aqi_hi: 150 },
  { pm_lo: 55.5,  pm_hi: 150.4, aqi_lo: 151, aqi_hi: 200 },
  { pm_lo: 150.5, pm_hi: 250.4, aqi_lo: 201, aqi_hi: 300 },
  { pm_lo: 250.5, pm_hi: 500.4, aqi_lo: 301, aqi_hi: 500 },
];

const AQI_TIERS = [
  { max:  50, label: 'Good',                    color: '#00E400' },
  { max: 100, label: 'Moderate',                color: '#FFFF00' },
  { max: 150, label: 'Unhealthy for Sensitive', color: '#FF7E00' },
  { max: 200, label: 'Unhealthy',               color: '#FF0000' },
  { max: 300, label: 'Very Unhealthy',          color: '#8F3F97' },
  { max: 500, label: 'Hazardous',               color: '#7E0023' },
];

function pm25ToAqi(pm) {
  const bp = AQI_BREAKPOINTS.find(b => pm <= b.pm_hi) ?? AQI_BREAKPOINTS.at(-1);
  return Math.round(Math.max(0,
    ((bp.aqi_hi - bp.aqi_lo) / (bp.pm_hi - bp.pm_lo)) * (pm - bp.pm_lo) + bp.aqi_lo
  ));
}

function aqiMeta(aqi) {
  const tier = AQI_TIERS.find(t => aqi <= t.max) ?? AQI_TIERS.at(-1);
  return { label: tier.label, color: tier.color };
}

function normalize(raw) {
  const pm25 = parseFloat(raw.pm25);
  const pm10 = parseFloat(raw.pm10);
  const aqi  = pm25ToAqi(pm25);
  const { label: aqiLabel, color: aqiColor } = aqiMeta(aqi);
  return { timestamp: new Date(), pm25: +pm25.toFixed(1), pm10: +pm10.toFixed(1), aqi, aqiLabel, aqiColor };
}

export class SensorManager {
  #timer    = null;
  #callback = null;
  #onError  = null;

  start(callback, onError = null) {
    this.#callback = callback;
    this.#onError  = onError;

    const poll = async () => {
      try {
        const res = await fetch(API_URL, {
          method:  'GET',
          headers: { 'Accept': 'application/json' },
          signal:  AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('[SensorManager] raw response:', JSON.stringify(data));
        this.#callback(normalize(data));
      } catch (err) {
        const isCors = err.message === 'Failed to fetch' || err.message === 'Load failed';
        const label  = isCors ? 'CORS blocked — add flask-cors to Pi server' : err.message;
        console.warn('[SensorManager]', label);
        if (this.#onError) this.#onError(label);
      }
    };

    poll();
    this.#timer = setInterval(poll, POLL_INTERVAL_MS);
  }

  stop() {
    clearInterval(this.#timer);
    this.#timer = null;
  }
}
