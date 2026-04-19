const PROFILES = {
  normal:  { multiplier: 1.0, label: 'Normal'  },
  asthma:  { multiplier: 1.6, label: 'Asthma'  },
  child:   { multiplier: 1.3, label: 'Child'   },
  elderly: { multiplier: 1.4, label: 'Elderly' },
};

const PM10_THRESHOLD = 45;
const PM10_PENALTY   = 0.15;

const ADVICE = {
  Low:      'Air quality is good. No precautions needed.',
  Moderate: 'Unusually sensitive individuals should limit prolonged outdoor exertion.',
  High:     'Reduce outdoor activity. Keep windows closed. Run an air purifier if available.',
  Critical: 'Stay indoors immediately. Wear an N95 mask if going out is unavoidable. Seek medical advice if symptomatic.',
};

export function calculateRisk(reading, profileKey = 'normal') {
  const profile = PROFILES[profileKey] ?? PROFILES.normal;

  let score = reading.aqi * profile.multiplier;

  if (reading.pm10 > PM10_THRESHOLD) {
    score += (reading.pm10 - PM10_THRESHOLD) * PM10_PENALTY * profile.multiplier;
  }

  score = Math.round(score);

  const level =
    score < 50  ? 'Low'      :
    score < 100 ? 'Moderate' :
    score < 150 ? 'High'     : 'Critical';

  return { level, score, advice: ADVICE[level], profileLabel: profile.label };
}

export const PROFILE_KEYS = Object.keys(PROFILES);
