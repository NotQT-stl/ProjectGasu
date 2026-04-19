import { SensorManager }               from './sensorManager.js';
import { ChartManager }                from './chartManager.js';
import { calculateRisk, PROFILE_KEYS } from './riskEngine.js';
import { LungStatusGraphic }           from './lungStatusGraphic.js';
import { WeatherApi }                  from './weatherApi.js';
import { ComparisonTab }               from './comparisonTab.js';

const sensor     = new SensorManager();
const chart      = new ChartManager();
const lungs      = new LungStatusGraphic('lung-graphic');
const weatherApi = new WeatherApi();
const cmpTab     = new ComparisonTab();

const aqiValueEl    = document.getElementById('aqi-value');
const aqiLabelEl    = document.getElementById('aqi-label');
const pm25El        = document.getElementById('pm25-value');
const pm10El        = document.getElementById('pm10-value');
const aqiCardEl     = document.getElementById('aqi-card-value');
const riskLevelEl   = document.getElementById('risk-level');
const riskAdviceEl  = document.getElementById('risk-advice');
const profileSelect = document.getElementById('profile-select');
const lastUpdatedEl = document.getElementById('last-updated');
const statusDot     = document.getElementById('status-dot');

PROFILE_KEYS.forEach(key => {
  const opt       = document.createElement('option');
  opt.value       = key;
  opt.textContent = key.charAt(0).toUpperCase() + key.slice(1);
  profileSelect.appendChild(opt);
});

chart.init('pm25-chart');

let latestReading = null;

profileSelect.addEventListener('change', () => {
  if (latestReading) updateRiskPanel(latestReading);
});

sensor.start((reading) => {
  latestReading = reading;
  statusDot.classList.add('live');
  statusDot.classList.remove('error');

  pm25El.textContent = reading.pm25.toFixed(1);
  pm10El.textContent = reading.pm10.toFixed(1);
  if (aqiCardEl) aqiCardEl.textContent = reading.aqi;

  aqiValueEl.textContent = reading.aqi;
  aqiLabelEl.textContent = reading.aqiLabel;
  aqiLabelEl.style.color = reading.aqiColor;

  lungs.update(reading.aqi);
  chart.push(reading);
  updateRiskPanel(reading);
  cmpTab.setSensorReading(reading);

  lastUpdatedEl.textContent = reading.timestamp.toLocaleTimeString();

}, (errMsg) => {
  statusDot.classList.remove('live');
  statusDot.classList.add('error');
  aqiLabelEl.textContent = 'Sensor offline';
  aqiLabelEl.style.color = '#ff4444';
});

cmpTab.setLoading();
weatherApi.start(
  (outdoor) => cmpTab.setOutdoorReading(outdoor),
  (err)     => cmpTab.setError(err)
);

document.getElementById('cmp-refresh-btn')
  ?.addEventListener('click', () => { cmpTab.setLoading(); weatherApi.refresh(); });
document.getElementById('cmp-retry-btn')
  ?.addEventListener('click', () => { cmpTab.setLoading(); weatherApi.refresh(); });

function updateRiskPanel(reading) {
  const profileKey = profileSelect.value || 'normal';
  const risk       = calculateRisk(reading, profileKey);

  riskLevelEl.textContent   = risk.level;
  riskLevelEl.dataset.level = risk.level;
  riskAdviceEl.textContent  = risk.advice;

  const profileLabel = document.getElementById('risk-profile-label');
  if (profileLabel) profileLabel.textContent = risk.profileLabel;
}

(function () {
  const sections = [
    document.querySelector('.hero-section'),
    document.getElementById('dashboard'),
    document.getElementById('compare-section'),
    document.getElementById('about'),
  ].filter(Boolean);

  const cntEl   = document.getElementById('cnt-current');
  const upBtn   = document.getElementById('cnt-up');
  const downBtn = document.getElementById('cnt-down');
  if (!cntEl || !sections.length) return;

  let current = 0;

  function scrollTo(idx) {
    idx = Math.max(0, Math.min(sections.length - 1, idx));
    sections[idx].scrollIntoView({ behavior: 'smooth' });
  }

  upBtn?.addEventListener('click',   () => scrollTo(current - 1));
  downBtn?.addEventListener('click', () => scrollTo(current + 1));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = sections.indexOf(entry.target);
        if (idx !== -1) {
          current = idx;
          cntEl.textContent = String(idx + 1).padStart(2, '0');
        }
      }
    });
  }, {
    rootMargin: '-45% 0px -45% 0px',
    threshold: 0,
  });

  sections.forEach(s => observer.observe(s));
})();
