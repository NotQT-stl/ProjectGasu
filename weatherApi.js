import {
  WEATHER_API_KEY,
  WEATHER_API_BASE,
  DEFAULT_LOCATION,
  OUTDOOR_REFRESH_MS,
} from './config.js';

const CACHE_KEY = 'projectgasu_outdoor_v1';

const EPA_META = {
  1: { label: 'Good',                    color: '#00E400' },
  2: { label: 'Moderate',                color: '#FFFF00' },
  3: { label: 'Unhealthy for Sensitive', color: '#FF7E00' },
  4: { label: 'Unhealthy',               color: '#FF0000' },
  5: { label: 'Very Unhealthy',          color: '#8F3F97' },
  6: { label: 'Hazardous',               color: '#7E0023' },
};

export class WeatherApi {
  #key      = WEATHER_API_KEY;
  #location = DEFAULT_LOCATION;
  #callback = null;
  #onError  = null;
  #timer    = null;

  start(callback, onError = null) {
    this.#callback = callback;
    this.#onError  = onError;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.#location = `${pos.coords.latitude},${pos.coords.longitude}`;
          this.#poll();
        },
        () => this.#poll()
      );
    } else {
      this.#poll();
    }

    this.#timer = setInterval(() => this.#poll(), OUTDOOR_REFRESH_MS);
  }

  refresh() { this.#poll(); }

  stop() { clearInterval(this.#timer); }

  async #poll() {
    try {
      const url = `${WEATHER_API_BASE}/current.json`
        + `?key=${this.#key}&q=${encodeURIComponent(this.#location)}&aqi=yes`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }

      const data    = await res.json();
      const reading = this.#normalize(data);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ...reading,
          timestamp: reading.timestamp.toISOString(),
        }));
      } catch (_) {}

      this.#callback(reading);
    } catch (err) {
      console.warn('[WeatherApi]', err.message);

      const cached = this.#loadCache();
      if (cached) {
        this.#callback(cached);
      } else if (this.#onError) {
        this.#onError(err.message);
      }
    }
  }

  #loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj     = JSON.parse(raw);
      obj.timestamp = new Date(obj.timestamp);
      obj.cached    = true;
      return obj;
    } catch (_) {
      return null;
    }
  }

  #normalize(raw) {
    const c    = raw.current;
    const aq   = c.air_quality;
    const idx  = aq['us-epa-index'] ?? 1;
    const meta = EPA_META[idx] ?? EPA_META[1];

    return {
      timestamp:  new Date(),
      location:   `${raw.location.name}, ${raw.location.country}`,
      tempC:      c.temp_c,
      humidity:   c.humidity,
      condition:  c.condition.text,
      condIcon:   'https:' + c.condition.icon,
      pm25:       +(aq.pm2_5 ?? 0).toFixed(1),
      pm10:       +(aq.pm10  ?? 0).toFixed(1),
      co:         +(aq.co    ?? 0).toFixed(1),
      no2:        +(aq.no2   ?? 0).toFixed(1),
      o3:         +(aq.o3    ?? 0).toFixed(1),
      so2:        +(aq.so2   ?? 0).toFixed(1),
      epaIndex:   idx,
      epaLabel:   meta.label,
      epaColor:   meta.color,
    };
  }
}
