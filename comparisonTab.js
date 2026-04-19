const EPA_AQI_MID = { 1: 25, 2: 75, 3: 125, 4: 175, 5: 250, 6: 350 };
const BAR_MAX = { pm25: 150, pm10: 300 };

export class ComparisonTab {
  #sensor  = null;
  #outdoor = null;
  #chart   = null;

  setSensorReading(reading) {
    this.#sensor = reading;
    const el = document.getElementById('cmp-sensor-time');
    if (el) el.textContent = reading.timestamp.toLocaleTimeString();
    this.#tryRender();
  }

  setOutdoorReading(reading) {
    this.#outdoor = reading;

    const timeEl  = document.getElementById('cmp-outdoor-time');
    const locEl   = document.getElementById('cmp-location');
    const cacheEl = document.getElementById('cmp-cached-badge');

    if (locEl) locEl.textContent = reading.location;

    if (reading.cached) {
      if (timeEl) timeEl.textContent = reading.timestamp.toLocaleTimeString();
      if (cacheEl) {
        cacheEl.style.display = '';
        cacheEl.textContent   = `Cached · ${this.#timeAgo(reading.timestamp)}`;
      }
      this.#setOutdoorDot('cached');
    } else {
      if (timeEl) timeEl.textContent = reading.timestamp.toLocaleTimeString();
      if (cacheEl) cacheEl.style.display = 'none';
      this.#setOutdoorDot('live');
    }

    this.#show('cmp-loading', false);
    this.#show('cmp-error',   false);
    this.#show('cmp-main',    true);

    this.#tryRender();
  }

  setLoading() {
    this.#show('cmp-loading', true);
    this.#show('cmp-error',   false);
    this.#show('cmp-main',    false);
    this.#setOutdoorDot('pending');
  }

  setError(msg) {
    this.#show('cmp-loading', false);
    this.#show('cmp-error',   true);
    this.#show('cmp-main',    false);
    this.#setOutdoorDot('error');
    const msgEl = document.getElementById('cmp-error-msg');
    if (msgEl) msgEl.textContent = msg;
  }

  #tryRender() {
    if (!this.#sensor || !this.#outdoor) return;
    const s = this.#sensor;
    const o = this.#outdoor;

    this.#renderMetric('pm25', s.pm25, o.pm25);
    this.#renderMetric('pm10', s.pm10, o.pm10);
    this.#renderAqi(s, o);
    this.#renderConditions(o);
    this.#renderVerdict(s, o);
    this.#renderInsights(s, o);
    this.#renderChart(s, o);
  }

  #renderMetric(key, indoor, outdoor) {
    const maxVal  = BAR_MAX[key] ?? 200;
    const diff    = indoor - outdoor;
    const absDiff = Math.abs(diff).toFixed(1);

    this.#setText(`cmp-${key}-in`,  indoor.toFixed(1));
    this.#setText(`cmp-${key}-out`, outdoor.toFixed(1));
    this.#setWidth(`cmp-${key}-in-bar`,  (indoor  / maxVal) * 100);
    this.#setWidth(`cmp-${key}-out-bar`, (outdoor / maxVal) * 100);

    this.#setColor(`cmp-${key}-in`,  diff > 3 ? '#ff9f40' : diff < -3 ? '#52b788' : '');
    this.#setColor(`cmp-${key}-out`, diff < -3 ? '#ff9f40' : diff > 3 ? '#52b788' : '');

    const chip = document.getElementById(`cmp-${key}-delta`);
    if (!chip) return;
    if (Math.abs(diff) < 2) {
      chip.textContent  = '≈ Similar';
      chip.dataset.type = 'neutral';
    } else if (diff < 0) {
      chip.textContent  = `↓ ${absDiff} lower indoors`;
      chip.dataset.type = 'good';
    } else {
      chip.textContent  = `↑ ${absDiff} higher indoors`;
      chip.dataset.type = 'warn';
    }
  }

  #renderAqi(s, o) {
    this.#setText('cmp-aqi-in',       s.aqi);
    this.#setText('cmp-aqi-in-label', s.aqiLabel);
    this.#setColor('cmp-aqi-in-label', s.aqiColor);

    this.#setText('cmp-aqi-out',       `${o.epaIndex}/6`);
    this.#setText('cmp-aqi-out-label', o.epaLabel);
    this.#setColor('cmp-aqi-out-label', o.epaColor);
  }

  #renderConditions(o) {
    this.#setText('cmp-temp',      `${o.tempC}°C`);
    this.#setText('cmp-humidity',  `${o.humidity}%`);
    this.#setText('cmp-condition', o.condition);

    const icon = document.getElementById('cmp-cond-icon');
    if (icon) icon.textContent = this.#conditionEmoji(o.condition);
  }

  #conditionEmoji(text) {
    const t = (text || '').toLowerCase();
    if (t.includes('thunder') || t.includes('storm'))                        return '⛈️';
    if (t.includes('blizzard'))                                              return '🌨️';
    if (t.includes('snow') || t.includes('sleet') || t.includes('ice pel')) return '❄️';
    if (t.includes('freezing') && t.includes('rain'))                        return '🌨️';
    if (t.includes('heavy rain') || t.includes('torrential'))                return '🌧️';
    if (t.includes('rain') || t.includes('drizzle') || t.includes('shower')) return '🌦️';
    if (t.includes('fog') || t.includes('mist') || t.includes('haze'))      return '🌫️';
    if (t.includes('overcast'))                                              return '☁️';
    if (t.includes('partly cloudy') || t.includes('partly'))                return '⛅';
    if (t.includes('cloudy'))                                                return '🌥️';
    if (t.includes('sunny') || t.includes('clear'))                         return '☀️';
    if (t.includes('wind') || t.includes('breezy'))                         return '💨';
    return '🌡️';
  }

  #renderVerdict(s, o) {
    const pm25Ratio = s.pm25 / Math.max(o.pm25, 0.5);

    const badge = document.getElementById('cmp-verdict-badge');
    const title = document.getElementById('cmp-verdict-title');
    const desc  = document.getElementById('cmp-verdict-desc');
    if (!badge) return;

    if (pm25Ratio < 0.85) {
      badge.textContent  = '✓  Better Indoors';
      badge.dataset.type = 'good';
      title.textContent  = 'Stay inside — your sensor air is cleaner';
      desc.textContent   = `Indoor PM2.5 is ${(o.pm25 - s.pm25).toFixed(1)} µg/m³ lower than outside. Keep windows closed to maintain this advantage.`;
    } else if (pm25Ratio > 1.20) {
      badge.textContent  = '↑  Better Outdoors';
      badge.dataset.type = 'warn';
      title.textContent  = 'Consider ventilating — outdoor air is cleaner';
      desc.textContent   = `Indoor PM2.5 (${s.pm25} µg/m³) is higher than outside (${o.pm25} µg/m³). Opening windows may improve indoor air quality.`;
    } else {
      badge.textContent  = '≈  Similar Conditions';
      badge.dataset.type = 'neutral';
      title.textContent  = 'Indoor and outdoor air quality are comparable';
      desc.textContent   = `PM2.5 levels are within ${Math.abs(s.pm25 - o.pm25).toFixed(1)} µg/m³ of each other. Either environment is suitable.`;
    }
  }

  #renderInsights(s, o) {
    const list = document.getElementById('cmp-insights-list');
    if (!list) return;

    const items = [];

    const pm25d = s.pm25 - o.pm25;
    if (Math.abs(pm25d) < 2) {
      items.push({ t: 'neutral', text: 'PM2.5 fine particle levels are similar indoors and outdoors.' });
    } else if (pm25d > 0) {
      items.push({ t: 'warn', text: `Indoor PM2.5 is ${pm25d.toFixed(1)} µg/m³ higher than outside. Consider an air purifier or open a window if outdoor quality allows.` });
    } else {
      items.push({ t: 'good', text: `Indoor air has ${Math.abs(pm25d).toFixed(1)} µg/m³ less PM2.5 than outside. Your space is well-filtered — keep windows closed.` });
    }

    const pm10d = s.pm10 - o.pm10;
    if (pm10d > 10) {
      items.push({ t: 'warn', text: `Coarse particles (PM10) are elevated indoors by ${pm10d.toFixed(0)} µg/m³. Check for dust, pets, or construction nearby.` });
    } else if (pm10d < -10) {
      items.push({ t: 'good', text: `PM10 coarse particles are ${Math.abs(pm10d).toFixed(0)} µg/m³ lower indoors. Good dust filtration.` });
    } else {
      items.push({ t: 'neutral', text: `PM10 coarse particle levels are comparable (Δ${Math.abs(pm10d).toFixed(0)} µg/m³).` });
    }

    if (o.tempC >= 35) {
      items.push({ t: 'info', text: `Outdoor temperature is high (${o.tempC}°C). Staying indoors reduces heat stress.` });
    } else if (o.tempC <= 15) {
      items.push({ t: 'info', text: `Outdoor temperature is cool (${o.tempC}°C). Ventilating briefly is low-risk for thermal comfort.` });
    }

    if (o.humidity > 85) {
      items.push({ t: 'info', text: `Outdoor humidity is ${o.humidity}% — very high. Opening windows may raise indoor moisture.` });
    }

    items.push({ t: 'info', text: `Outdoor air quality: ${o.epaLabel} (EPA index ${o.epaIndex}/6). Conditions: ${o.condition}.` });

    const ICON = { good: '✓', warn: '⚠', neutral: '→', info: 'ℹ' };
    list.innerHTML = items.map(i => `
      <div class="insight-item insight-${i.t}">
        <span class="insight-icon">${ICON[i.t]}</span>
        <p>${i.text}</p>
      </div>
    `).join('');
  }

  #renderChart(s, o) {
    const ctx = document.getElementById('cmp-chart');
    if (!ctx || typeof Chart === 'undefined') return;

    const chartData = {
      labels: ['PM2.5  (µg/m³)', 'PM10  (µg/m³)'],
      datasets: [
        {
          label: '🏠  Our Sensor',
          data: [s.pm25, s.pm10],
          backgroundColor: 'rgba(82, 183, 136, 0.72)',
          borderColor:     'rgba(82, 183, 136, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: '🌤  Outdoor (WeatherAPI)',
          data: [o.pm25, o.pm10],
          backgroundColor: 'rgba(90, 140, 255, 0.72)',
          borderColor:     'rgba(90, 140, 255, 1)',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };

    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      plugins: {
        legend: {
          labels: { color: 'rgba(19,42,30,0.80)', font: { size: 12, family: 'Inter' } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} µg/m³`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: 'rgba(19,42,30,0.45)', font: { size: 11 } },
          grid:  { color: 'rgba(82,183,136,0.12)' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: 'rgba(19,42,30,0.45)', font: { size: 11 } },
          grid:  { color: 'rgba(82,183,136,0.12)' },
        },
      },
    };

    if (this.#chart) {
      this.#chart.data = chartData;
      this.#chart.update('none');
    } else {
      this.#chart = new Chart(ctx, { type: 'bar', data: chartData, options: opts });
    }
  }

  #setText(id, val)  { const el = document.getElementById(id); if (el) el.textContent = val; }
  #setColor(id, col) { const el = document.getElementById(id); if (el) el.style.color  = col; }
  #show(id, vis)     { const el = document.getElementById(id); if (el) el.style.display = vis ? '' : 'none'; }
  #setWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(Math.max(pct, 2), 100)}%`;
  }
  #setOutdoorDot(state) {
    const dot = document.getElementById('cmp-outdoor-dot');
    if (!dot) return;
    dot.dataset.state = state;
  }

  #timeAgo(date) {
    const diffMs  = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < 1)  return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH  = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    return remMin > 0 ? `${diffH}h ${remMin}m ago` : `${diffH}h ago`;
  }
}
