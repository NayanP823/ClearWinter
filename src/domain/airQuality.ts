import type {
  AirQualitySnapshot,
  AqiCategoryInfo,
  CityLocation,
  HourlyAirPoint,
  HouseholdProfile,
  InversionRiskAssessment,
  VentilationWindow,
} from './types';

export const PRESET_CITIES: CityLocation[] = [
  {
    id: 'new-delhi',
    name: 'New Delhi',
    country: 'India',
    region: 'Delhi NCR',
    latitude: 28.6139,
    longitude: 77.209,
    winterNote: 'Severe morning & late-evening winter smog across Delhi NCR.',
  },
  {
    id: 'gurugram',
    name: 'Gurugram',
    country: 'India',
    region: 'Haryana · NCR',
    latitude: 28.4595,
    longitude: 77.0266,
    winterNote: 'High highway traffic dust and calm winter fog trapping.',
  },
  {
    id: 'noida',
    name: 'Noida',
    country: 'India',
    region: 'Uttar Pradesh · NCR',
    latitude: 28.5355,
    longitude: 77.391,
    winterNote: 'Dense winter haze around high-rise societies and expressways.',
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    country: 'India',
    region: 'Uttar Pradesh',
    latitude: 26.8467,
    longitude: 80.9462,
    winterNote: 'Cold Gangetic plain nights trap smoke and road dust near ground level.',
  },
  {
    id: 'kanpur',
    name: 'Kanpur',
    country: 'India',
    region: 'Uttar Pradesh',
    latitude: 26.4499,
    longitude: 80.3319,
    winterNote: 'Calm winter air amplifies industrial and roadside particulate smog.',
  },
  {
    id: 'patna',
    name: 'Patna',
    country: 'India',
    region: 'Bihar',
    latitude: 25.5941,
    longitude: 85.1376,
    winterNote: 'River-basin winter fog holds fine PM2.5 close to residential lanes.',
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    country: 'India',
    region: 'West Bengal',
    latitude: 22.5726,
    longitude: 88.3639,
    winterNote: 'Humid winter evenings trap traffic exhaust and fine particulates.',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    region: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
    winterNote: 'Slower winter sea breezes raise construction dust and coastal haze.',
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    country: 'India',
    region: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    winterNote: 'Cool winter mornings cause localized traffic haze along main corridors.',
  },
];

interface AqiBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * Official US EPA PM2.5 (24-hour) AQI breakpoints (updated 2024 revision).
 */
const PM25_BREAKPOINTS: AqiBreakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400 },
  { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

/**
 * Calculates US EPA AQI from a PM2.5 concentration in ug/m3.
 */
export function calculatePm25Aqi(pm25Raw: number): number {
  if (!Number.isFinite(pm25Raw) || pm25Raw <= 0) {
    return 0;
  }
  const c = Math.floor(pm25Raw * 10) / 10;
  if (c >= 500.4) {
    return 500;
  }
  for (const bp of PM25_BREAKPOINTS) {
    if (c >= bp.cLow && c <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }
  return 500;
}

/**
 * Returns accessible category labels, health summary, and semantic colors for US AQI.
 */
export function getAqiCategory(aqi: number): AqiCategoryInfo {
  const safeAqi = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;

  if (safeAqi <= 50) {
    return {
      level: 'good',
      label: 'Good',
      shortLabel: 'Good',
      summary: 'Air quality is satisfactory with minimal winter particulate risk.',
      textClass: 'text-emerald-700',
      accentHex: '#15803d',
      barClass: 'bg-emerald-600',
    };
  }
  if (safeAqi <= 100) {
    return {
      level: 'moderate',
      label: 'Moderate',
      shortLabel: 'Moderate',
      summary: 'Acceptable overall; unusually sensitive individuals should limit prolonged roadside exertion.',
      textClass: 'text-amber-700',
      accentHex: '#b45309',
      barClass: 'bg-amber-600',
    };
  }
  if (safeAqi <= 150) {
    return {
      level: 'sensitive',
      label: 'Unhealthy for Sensitive Groups',
      shortLabel: 'Sensitive Alert',
      summary: 'Children, older adults, and people with asthma should reduce outdoor activity and filter indoor air.',
      textClass: 'text-orange-700',
      accentHex: '#c2410c',
      barClass: 'bg-orange-600',
    };
  }
  if (safeAqi <= 200) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy',
      shortLabel: 'Unhealthy',
      summary: 'Everyone begins to experience respiratory irritation; keep windows sealed during rush hours and run HEPA filtration.',
      textClass: 'text-red-700',
      accentHex: '#b91c1c',
      barClass: 'bg-red-600',
    };
  }
  if (safeAqi <= 300) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy',
      shortLabel: 'Very Unhealthy',
      summary: 'Health alert: avoid outdoor exercise, wear fitted N95/FFP2 masks outdoors, and create a clean-air room indoors.',
      textClass: 'text-purple-800',
      accentHex: '#6b21a8',
      barClass: 'bg-purple-700',
    };
  }
  return {
    level: 'hazardous',
    label: 'Hazardous',
    shortLabel: 'Hazardous',
    summary: 'Emergency smog conditions: remain indoors with continuous filtration, seal drafts, and eliminate indoor combustion.',
    textClass: 'text-rose-900',
    accentHex: '#881337',
    barClass: 'bg-rose-900',
  };
}

/**
 * Estimates winter thermal inversion trapping risk using wind speed, temperature, humidity, and current PM2.5.
 * Low wind + cold air + high humidity + elevated PM2.5 strongly indicate shallow boundary-layer trapping.
 */
export function calculateInversionRisk(params: {
  windKmh: number;
  tempC: number;
  humidityPct: number;
  pm25: number;
}): InversionRiskAssessment {
  const windScore = params.windKmh <= 5 ? 40 : params.windKmh <= 10 ? 28 : params.windKmh <= 16 ? 14 : 4;
  const coldScore = params.tempC <= 4 ? 25 : params.tempC <= 12 ? 18 : params.tempC <= 18 ? 10 : 3;
  const humidityScore = params.humidityPct >= 75 ? 15 : params.humidityPct >= 55 ? 9 : 4;
  const pmScore = params.pm25 >= 150 ? 20 : params.pm25 >= 75 ? 15 : params.pm25 >= 35 ? 10 : 3;

  const score = Math.min(100, Math.max(0, windScore + coldScore + humidityScore + pmScore));

  if (score >= 78) {
    return {
      level: 'Severe',
      score,
      explanation:
        'Calm cold air is acting like a lid over the city, preventing traffic and heating emissions from dispersing.',
      peakTrapHours: '05:00 – 10:00 and 19:00 – 01:00',
    };
  }
  if (score >= 58) {
    return {
      level: 'High',
      score,
      explanation:
        'Light winds and cool winter temperatures allow particulate pollution to accumulate rapidly at street level.',
      peakTrapHours: '06:00 – 09:30 and 20:00 – 23:30',
    };
  }
  if (score >= 35) {
    return {
      level: 'Elevated',
      score,
      explanation:
        'Moderate atmospheric stability; rush-hour emissions linger in narrow streets and valleys.',
      peakTrapHours: '07:00 – 09:00 and 18:30 – 21:00',
    };
  }
  return {
    level: 'Low',
    score,
    explanation:
      'Active winds are dispersing winter particulates well across the boundary layer.',
    peakTrapHours: 'Minimal trapping expected today',
  };
}

/**
 * Finds the cleanest contiguous 2-hour window in the 24-hour forecast for brief indoor cross-ventilation.
 */
export function findBestVentilationWindow(hourly: HourlyAirPoint[]): VentilationWindow {
  if (hourly.length === 0) {
    return {
      startHour: '13:00',
      endHour: '15:00',
      avgPm25: 0,
      avgAqi: 0,
      recommendedMinutes: 10,
      advisory: 'No hourly telemetry available; ventilate briefly during mid-afternoon if outdoor air looks clear.',
      isSafeToOpen: false,
    };
  }

  let bestStartIdx = 0;
  let lowestAvgPm25 = Number.POSITIVE_INFINITY;
  const windowSize = hourly.length >= 2 ? 2 : 1;

  for (let i = 0; i <= hourly.length - windowSize; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += hourly[i + j].pm25;
    }
    const avg = sum / windowSize;
    if (avg < lowestAvgPm25) {
      lowestAvgPm25 = avg;
      bestStartIdx = i;
    }
  }

  const startPoint = hourly[bestStartIdx];
  const endPoint = hourly[Math.min(bestStartIdx + windowSize - 1, hourly.length - 1)];
  const avgPm25 = Math.round(lowestAvgPm25 * 10) / 10;
  const avgAqi = calculatePm25Aqi(avgPm25);

  if (avgPm25 <= 25) {
    return {
      startHour: startPoint.hourLabel,
      endHour: endPoint.hourLabel,
      avgPm25,
      avgAqi,
      recommendedMinutes: 30,
      advisory: 'Open opposite windows for 20–30 minutes to flush indoor CO2 and cooking fumes.',
      isSafeToOpen: true,
    };
  }
  if (avgPm25 <= 60) {
    return {
      startHour: startPoint.hourLabel,
      endHour: endPoint.hourLabel,
      avgPm25,
      avgAqi,
      recommendedMinutes: 10,
      advisory: 'Brief 5–10 minute cross-ventilation is acceptable during this lowest-smog window, then run filtration.',
      isSafeToOpen: true,
    };
  }
  return {
    startHour: startPoint.hourLabel,
    endHour: endPoint.hourLabel,
    avgPm25,
    avgAqi,
    recommendedMinutes: 0,
    advisory: 'Keep windows closed all day; rely on HEPA or Corsi-Rosenthal filtration and crack a window only if indoor CO2 exceeds 1,200 ppm.',
    isSafeToOpen: false,
  };
}

/**
 * Generates concise, actionable health guidance tuned to sensitive household members.
 */
export function getHouseholdHealthGuidance(
  aqi: number,
  profile: HouseholdProfile,
): string[] {
  const guidance: string[] = [];
  const hasSensitive = profile.sensitiveGroups.length > 0;

  if (aqi >= 151) {
    guidance.push(
      'Wear a snug-fitting N95, KN95, or FFP2 respirator for all outdoor commutes over 10 minutes.',
    );
    guidance.push(
      'Designate one bedroom as a sealed clean-air zone running continuous filtration overnight.',
    );
  } else if (aqi >= 101) {
    guidance.push(
      'Shift vigorous outdoor exercise indoors and avoid walking alongside congested winter arterials.',
    );
  } else {
    guidance.push(
      'Outdoor errands are generally safe; prioritize mid-afternoon for family walks when inversion lifts.',
    );
  }

  if (profile.sensitiveGroups.includes('asthma') && aqi >= 101) {
    guidance.push(
      'Asthma safeguard: keep rescue inhalers accessible, pre-cool/filter bedrooms before sleep, and avoid indoor incense or candles.',
    );
  }
  if (profile.sensitiveGroups.includes('children') && aqi >= 120) {
    guidance.push(
      'Children safeguard: coordinate indoor recess or shifted afternoon outdoor play; children inhale up to 50% more air per body weight.',
    );
  }
  if (profile.sensitiveGroups.includes('seniors') && aqi >= 101) {
    guidance.push(
      'Older adults safeguard: schedule medical visits or errands during the afternoon dispersal trough rather than early morning fog.',
    );
  }
  if (profile.sensitiveGroups.includes('pregnancy') && aqi >= 101) {
    guidance.push(
      'Prenatal safeguard: minimize exposure to traffic exhaust and unvented gas stoves by running range hoods on high.',
    );
  }

  if (!hasSensitive && aqi < 101) {
    guidance.push(
      'Use today’s relatively clear air to check door weatherstripping and clean purifier pre-filters before the next cold inversion.',
    );
  }

  return guidance;
}

/**
 * Returns a calm, plain-language summary sentence for older family members
 * so they know what to do right now without decoding technical charts.
 */
export function getSimpleDailyHeadline(
  aqi: number,
  cityName: string,
  ventilation: VentilationWindow,
): { title: string; advice: string } {
  const category = getAqiCategory(aqi);
  if (aqi >= 201) {
    return {
      title: `Air in ${cityName} is ${category.label} today (AQI ${aqi}).`,
      advice: ventilation.isSafeToOpen
        ? `Skip early morning walks. Keep windows and balcony doors shut, wear an N95 mask outside, and air rooms only briefly between ${ventilation.startHour} and ${ventilation.endHour}.`
        : `Skip early morning and evening walks today. Keep windows and balcony doors closed, run an indoor air filter if available, and wear a snug N95 mask if stepping outside.`,
    };
  }
  if (aqi >= 151) {
    return {
      title: `Air in ${cityName} is Unhealthy today (AQI ${aqi}).`,
      advice: `Avoid outdoor walks before 10:00 AM and after sunset. The cleanest time for quick errands or airing rooms is ${ventilation.startHour} to ${ventilation.endHour}.`,
    };
  }
  if (aqi >= 101) {
    return {
      title: `Air in ${cityName} needs extra care for seniors and children (AQI ${aqi}).`,
      advice: `Prefer mid-afternoon walks between ${ventilation.startHour} and ${ventilation.endHour} away from busy main roads, and use exhaust fans while cooking.`,
    };
  }
  return {
    title: `Air in ${cityName} is ${category.label} today (AQI ${aqi}).`,
    advice: `Regular outdoor walks are comfortable today. You can safely open windows between ${ventilation.startHour} and ${ventilation.endHour} for fresh cross-ventilation.`,
  };
}

/**
 * Builds deterministic seasonal winter smog baseline snapshots when external live telemetry is unavailable.
 */
export function buildSeasonalBaselineSnapshot(city: CityLocation): AirQualitySnapshot {
  const presets: Record<
    string,
    { pm25: number; pm10: number; no2: number; o3: number; tempC: number; windKmh: number; humidityPct: number }
  > = {
    'new-delhi': { pm25: 196, pm10: 294, no2: 64, o3: 32, tempC: 11, windKmh: 4.2, humidityPct: 79 },
    gurugram: { pm25: 184, pm10: 278, no2: 59, o3: 31, tempC: 11, windKmh: 4.5, humidityPct: 76 },
    noida: { pm25: 192, pm10: 288, no2: 61, o3: 30, tempC: 11, windKmh: 4.0, humidityPct: 80 },
    lucknow: { pm25: 148, pm10: 215, no2: 48, o3: 29, tempC: 12, windKmh: 4.6, humidityPct: 81 },
    kanpur: { pm25: 162, pm10: 238, no2: 52, o3: 28, tempC: 12, windKmh: 4.3, humidityPct: 78 },
    patna: { pm25: 156, pm10: 224, no2: 44, o3: 27, tempC: 13, windKmh: 4.1, humidityPct: 83 },
    kolkata: { pm25: 112, pm10: 168, no2: 46, o3: 33, tempC: 17, windKmh: 5.4, humidityPct: 77 },
    mumbai: { pm25: 76, pm10: 128, no2: 41, o3: 38, tempC: 22, windKmh: 8.2, humidityPct: 68 },
    bengaluru: { pm25: 44, pm10: 74, no2: 31, o3: 36, tempC: 18, windKmh: 9.4, humidityPct: 64 },
  };

  const base = presets[city.id] ?? {
    pm25: 84,
    pm10: 118,
    no2: 44,
    o3: 30,
    tempC: 3,
    windKmh: 5.5,
    humidityPct: 72,
  };

  // Diurnal winter inversion profile: peaks 07:00-09:00 and 21:00-23:00, lowest 13:00-16:00
  const diurnalFactors = [
    1.15, 1.12, 1.08, 1.05, 1.06, 1.12, 1.24, 1.32, 1.28, 1.14, 0.96, 0.82,
    0.72, 0.64, 0.62, 0.66, 0.78, 0.94, 1.08, 1.18, 1.26, 1.29, 1.24, 1.19,
  ];

  const today = new Date();
  today.setMinutes(0, 0, 0);

  const hourly: HourlyAirPoint[] = diurnalFactors.map((factor, hour) => {
    const pm25 = Math.round(base.pm25 * factor * 10) / 10;
    const pm10 = Math.round(base.pm10 * factor * 10) / 10;
    const windKmh = Math.round((base.windKmh * (factor < 0.8 ? 1.55 : 0.85)) * 10) / 10;
    const tempC = Math.round((base.tempC + (hour >= 11 && hour <= 16 ? 5 : hour <= 6 ? -3 : 0)) * 10) / 10;
    const label = `${String(hour).padStart(2, '0')}:00`;
    const slotDate = new Date(today);
    slotDate.setHours(hour);
    return {
      hourLabel: label,
      isoTime: slotDate.toISOString(),
      pm25,
      pm10,
      usAqi: calculatePm25Aqi(pm25),
      windKmh,
      tempC,
    };
  });

  return {
    city,
    source: 'seasonal-baseline',
    updatedAt: new Date().toISOString(),
    usAqi: calculatePm25Aqi(base.pm25),
    pm25: base.pm25,
    pm10: base.pm10,
    no2: base.no2,
    o3: base.o3,
    tempC: base.tempC,
    windKmh: base.windKmh,
    humidityPct: base.humidityPct,
    hourly,
  };
}
