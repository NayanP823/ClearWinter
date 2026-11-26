import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeasonalBaselineSnapshot,
  calculateInversionRisk,
  calculatePm25Aqi,
  findBestVentilationWindow,
  getAqiCategory,
  getHouseholdHealthGuidance,
  getSimpleDailyHeadline,
  PRESET_CITIES,
} from './airQuality';
import { DEFAULT_HOUSEHOLD_PROFILE } from './impactCalculator';

test('calculatePm25Aqi adheres to US EPA 2024 PM2.5 breakpoints', () => {
  assert.equal(calculatePm25Aqi(0), 0);
  assert.equal(calculatePm25Aqi(-10), 0);
  assert.equal(calculatePm25Aqi(9.0), 50);
  assert.equal(calculatePm25Aqi(35.4), 100);
  assert.equal(calculatePm25Aqi(55.4), 150);
  assert.equal(calculatePm25Aqi(125.4), 200);
  assert.equal(calculatePm25Aqi(225.4), 300);
  assert.equal(calculatePm25Aqi(520), 500);
});

test('getAqiCategory maps AQI ranges to explicit accessible labels', () => {
  assert.equal(getAqiCategory(35).level, 'good');
  assert.equal(getAqiCategory(80).level, 'moderate');
  assert.equal(getAqiCategory(135).level, 'sensitive');
  assert.equal(getAqiCategory(180).level, 'unhealthy');
  assert.equal(getAqiCategory(240).level, 'very_unhealthy');
  assert.equal(getAqiCategory(350).level, 'hazardous');
});

test('calculateInversionRisk scores calm cold polluted air as Severe', () => {
  const severe = calculateInversionRisk({
    windKmh: 3.5,
    tempC: 2,
    humidityPct: 82,
    pm25: 185,
  });
  assert.equal(severe.level, 'Severe');
  assert.ok(severe.score >= 85);

  const low = calculateInversionRisk({
    windKmh: 24,
    tempC: 20,
    humidityPct: 40,
    pm25: 12,
  });
  assert.equal(low.level, 'Low');
  assert.ok(low.score < 35);
});

test('findBestVentilationWindow identifies the lowest-PM2.5 2-hour trough for Indian cities', () => {
  const bengaluru = PRESET_CITIES.find((c) => c.id === 'bengaluru')!;
  const baseline = buildSeasonalBaselineSnapshot(bengaluru);
  const windowInfo = findBestVentilationWindow(baseline.hourly);
  assert.equal(windowInfo.startHour, '13:00');
  assert.equal(windowInfo.endHour, '14:00');
  assert.equal(windowInfo.isSafeToOpen, true);
  assert.ok(windowInfo.avgPm25 < baseline.pm25);

  // Severe smog city (New Delhi) should advise keeping windows closed
  const delhi = buildSeasonalBaselineSnapshot(PRESET_CITIES[0]);
  const delhiWindow = findBestVentilationWindow(delhi.hourly);
  assert.equal(delhiWindow.isSafeToOpen, false);
  assert.equal(delhiWindow.recommendedMinutes, 0);
});

test('getSimpleDailyHeadline produces clear advice for senior citizens', () => {
  const delhi = buildSeasonalBaselineSnapshot(PRESET_CITIES[0]);
  const delhiWindow = findBestVentilationWindow(delhi.hourly);
  const summary = getSimpleDailyHeadline(245, 'New Delhi', delhiWindow);
  assert.ok(summary.title.includes('New Delhi'));
  assert.ok(summary.advice.toLowerCase().includes('n95'));
});

test('getHouseholdHealthGuidance includes targeted safeguards for asthma and children', () => {
  const guidance = getHouseholdHealthGuidance(185, {
    ...DEFAULT_HOUSEHOLD_PROFILE,
    sensitiveGroups: ['children', 'asthma'],
  });
  assert.ok(guidance.some((g) => g.toLowerCase().includes('n95')));
  assert.ok(guidance.some((g) => g.toLowerCase().includes('asthma')));
  assert.ok(guidance.some((g) => g.toLowerCase().includes('children')));
});
