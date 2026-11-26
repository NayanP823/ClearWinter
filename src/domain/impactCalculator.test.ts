import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeasonalBaselineSnapshot, PRESET_CITIES } from './airQuality';
import {
  calculateHouseholdImpact,
  DEFAULT_HOUSEHOLD_PROFILE,
  DEFAULT_SMOG_ACTIONS,
  estimateBaselineIndoorPm25,
  formatInr,
  rankActionsForProfile,
} from './impactCalculator';

test('formatInr formats Indian Rupee figures using en-IN grouping without dollar signs', () => {
  assert.equal(formatInr(125000), '₹1,25,000');
  assert.equal(formatInr(0), '₹0');
  for (const action of DEFAULT_SMOG_ACTIONS) {
    const combined = `${action.title} ${action.summary} ${action.directImpactExplanation} ${action.steps.join(' ')}`;
    assert.equal(combined.includes('$'), false, `Unexpected $ found in action ${action.id}`);
  }
});

test('estimateBaselineIndoorPm25 increases with indoor biomass/wood combustion and drops with HEPA', () => {
  const noPurifierWood = estimateBaselineIndoorPm25(120, {
    ...DEFAULT_HOUSEHOLD_PROFILE,
    heatingFuel: 'wood_coal',
    cookingFuel: 'solid_biomass',
    purifierAccess: 'none',
  });
  const hepaElectric = estimateBaselineIndoorPm25(120, {
    ...DEFAULT_HOUSEHOLD_PROFILE,
    heatingFuel: 'electric_heat_pump',
    cookingFuel: 'induction_electric',
    purifierAccess: 'hepa_unit',
  });
  assert.ok(noPurifierWood > hepaElectric * 2);
});

test('calculateHouseholdImpact computes realistic compounded PM2.5 drops, INR savings, and society scaling', () => {
  const snapshot = buildSeasonalBaselineSnapshot(PRESET_CITIES[0]);
  const profile = {
    ...DEFAULT_HOUSEHOLD_PROFILE,
    communityHouseholds: 50,
  };

  const emptyImpact = calculateHouseholdImpact(
    profile,
    snapshot,
    [],
    DEFAULT_SMOG_ACTIONS,
  );
  assert.equal(emptyImpact.indoorPm25ReductionPct, 0);
  assert.equal(emptyImpact.dailyCo2eSavedKg, 0);
  assert.equal(emptyImpact.monthlySavingsInr, 0);
  assert.equal(emptyImpact.activeActionCount, 0);

  const selectedIds = [
    'hack-corsi-rosenthal-box',
    'alt-transit-carpool-swap',
    'alt-electric-cooking-kettle',
  ];
  const impact = calculateHouseholdImpact(
    profile,
    snapshot,
    selectedIds,
    DEFAULT_SMOG_ACTIONS,
  );

  assert.equal(impact.activeActionCount, 3);
  assert.ok(impact.projectedIndoorPm25 < impact.baselineIndoorPm25);
  assert.ok(impact.indoorPm25ReductionPct > 50 && impact.indoorPm25ReductionPct <= 85);
  assert.ok(impact.cigaretteEquivalentsAvoidedPerDay > 2);
  assert.ok(impact.dailyCo2eSavedKg > 3);
  assert.ok(impact.monthlySavingsInr > 3000);
  assert.equal(impact.communityMonthlySavingsInr, impact.monthlySavingsInr * 50);
  assert.equal(
    impact.communityMonthlyCo2eSavedKg,
    Math.round(impact.monthlyCo2eSavedKg * 50 * 10) / 10,
  );
  assert.ok(impact.equivalentWinterCarTripsAvoidedPerMonth > 100);
});

test('rankActionsForProfile elevates profile-matched and AI-tailored actions', () => {
  const snapshot = buildSeasonalBaselineSnapshot(PRESET_CITIES[0]);
  const tailoredAction = {
    ...DEFAULT_SMOG_ACTIONS[0],
    id: 'ai-custom-1',
    origin: 'gemini-tailored' as const,
  };
  const ranked = rankActionsForProfile(
    [...DEFAULT_SMOG_ACTIONS, tailoredAction],
    DEFAULT_HOUSEHOLD_PROFILE,
    snapshot,
  );
  assert.equal(ranked[0].id, 'ai-custom-1');
});
