import type {
  AirQualitySnapshot,
  HouseholdProfile,
  ImpactMetrics,
  SmogAction,
} from './types';

export const DEFAULT_HOUSEHOLD_PROFILE: HouseholdProfile = {
  householdSize: 4,
  homeType: 'apartment',
  commuteMode: 'petrol_car',
  dailyCommuteKm: 18,
  heatingFuel: 'minimal_heating',
  cookingFuel: 'gas_stove',
  purifierAccess: 'none',
  sensitiveGroups: ['seniors', 'children'],
  communityHouseholds: 25,
};

/**
 * Formats an Indian Rupee amount cleanly using the Indian numbering system (e.g. ₹1,25,000).
 */
export function formatInr(amount: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return `₹${safe.toLocaleString('en-IN')}`;
}

/**
 * Curated evidence-based winter smog actions tailored to Indian homes, RWAs, and budgets (in INR).
 */
export const DEFAULT_SMOG_ACTIONS: SmogAction[] = [
  {
    id: 'routine-afternoon-ventilation',
    title: 'Shift walks, market trips & airing rooms to afternoon hours',
    category: 'routine',
    timeSlot: 'midday',
    costTier: 'Free',
    difficulty: 'Easy',
    summary:
      'Skip 6:00–10:00 AM winter fog walks; do sabzi/market errands and brief window airing between 1:00 PM and 4:00 PM when sun warms the air.',
    steps: [
      'Keep main doors and balcony sliding doors shut during early morning and late evening smog.',
      'Open opposite windows for 10 minutes only during the cleanest afternoon window.',
      'For elders and children, walk indoors or on a terrace only during sunny afternoon hours.',
    ],
    indoorPm25ReductionFraction: 0.16,
    dailyCo2eSavedGrams: 420,
    dailyLocalPm25SavedMg: 12,
    dailySavingsInr: 0,
    directImpactExplanation:
      'Morning winter fog traps heavy smoke close to the ground. Waiting until afternoon cuts the polluted air entering your home and lungs.',
    origin: 'evidence-catalog',
  },
  {
    id: 'routine-no-idling-trip-chain',
    title: 'Turn off engine at red lights & combine daily market runs',
    category: 'routine',
    timeSlot: 'morning',
    costTier: 'Free',
    difficulty: 'Easy',
    summary:
      'Avoid idling cars or two-wheelers in society parking and traffic signals; batch school drop-off, dairy, and market trips into one loop.',
    steps: [
      'Switch off the engine at red lights longer than 20 seconds and at society gates.',
      'Start the engine only once everyone is seated—modern engines do not need driveway warm-up.',
      'Club morning milk, vegetable, and pharmacy errands into a single trip.',
    ],
    indoorPm25ReductionFraction: 0.05,
    dailyCo2eSavedGrams: 1450,
    dailyLocalPm25SavedMg: 68,
    dailySavingsInr: 45,
    directImpactExplanation:
      'Cold-start exhaust releases up to 4x more soot right near apartment gates and children waiting for school buses, while wasting petrol worth over ₹1,300/month.',
    relevantTo: {
      commuteModes: ['petrol_car', 'diesel_suv', 'two_wheeler'],
    },
    origin: 'evidence-catalog',
  },
  {
    id: 'routine-zero-indoor-combustion',
    title: 'Pause agarbatti, dhoop & mosquito coils on high-smog days',
    category: 'routine',
    timeSlot: 'evening',
    costTier: 'Free',
    difficulty: 'Easy',
    summary:
      'Keep indoor air smoke-free on bad AQI nights by pausing incense sticks, dhoop cones, and burning coils inside closed rooms.',
    steps: [
      'Use electric diya lamps, camphor diffusers, or fresh flowers for evening prayers on severe smog days.',
      'Switch from burning mosquito coils to electric liquid vaporizers or window mesh screens.',
      'Keep kitchen chimney or exhaust fan running on high during tadka and frying.',
    ],
    indoorPm25ReductionFraction: 0.18,
    dailyCo2eSavedGrams: 310,
    dailyLocalPm25SavedMg: 45,
    dailySavingsInr: 15,
    directImpactExplanation:
      'Burning one agarbatti or mosquito coil in a closed winter bedroom can spike indoor PM2.5 above 250 µg/m³—undoing the benefit of closed windows.',
    origin: 'evidence-catalog',
  },
  {
    id: 'hack-corsi-rosenthal-box',
    title: 'Build a budget DIY HEPA / MERV-13 fan air cleaner (under ₹3,500)',
    category: 'indoor_hack',
    timeSlot: 'anytime',
    costTier: 'Low Cost',
    difficulty: 'Easy',
    summary:
      'Tape a pleated HEPA or MERV-13 filter tightly to the back of a standard 400mm Indian table or exhaust fan for strong room cleaning at one-third the price.',
    steps: [
      'Buy a 400mm (16-inch) Indian box or table fan (~₹1,500) and a replacement HEPA/MERV-13 filter (~₹1,200–₹1,800).',
      'Seal all four edges of the filter onto the back intake side of the fan using wide cloth tape so air passes through the filter.',
      'Run the fan on medium speed in the bedroom with doors closed—replace the filter when it turns dark grey.',
    ],
    indoorPm25ReductionFraction: 0.52,
    dailyCo2eSavedGrams: 0,
    dailyLocalPm25SavedMg: 0,
    dailySavingsInr: 0,
    directImpactExplanation:
      'Delivers clean-air flow comparable to ₹12,000–₹18,000 branded purifiers, cutting bedroom PM2.5 by 50–65% for a fraction of the cost.',
    relevantTo: {
      purifierAccess: ['none', 'diy_corsi_rosenthal'],
    },
    origin: 'evidence-catalog',
  },
  {
    id: 'hack-wet-mop-entry-seal',
    title: 'Use wet pocha instead of dry jhadu & seal door gaps',
    category: 'indoor_hack',
    timeSlot: 'evening',
    costTier: 'Free',
    difficulty: 'Easy',
    summary:
      'Wet mopping traps settled winter soot instead of lifting it back into the air, while a rolled damp cloth or foam strip blocks outdoor smog under doors.',
    steps: [
      'Do a damp cloth mop (wet pocha) every day or alternate day instead of dry broom sweeping.',
      'Leave outdoor chappals and shoes on a rack outside the main door so street dust stays out.',
      'Place a ₹150 foam door-seal strip or rolled towel along balcony sliding doors and main door gaps.',
    ],
    indoorPm25ReductionFraction: 0.14,
    dailyCo2eSavedGrams: 0,
    dailyLocalPm25SavedMg: 0,
    dailySavingsInr: 0,
    directImpactExplanation:
      'Dry sweeping kicks fine street dust right back into breathing height for seniors and kids; damp cleaning locks dust away permanently.',
    origin: 'evidence-catalog',
  },
  {
    id: 'hack-clean-air-bedroom-zone',
    title: 'Set up one clean-air sleeping room for elders & children',
    category: 'indoor_hack',
    timeSlot: 'evening',
    costTier: 'Low Cost',
    difficulty: 'Easy',
    summary:
      'Focus filtration in the bedroom where family members spend 8 full hours breathing deeply overnight.',
    steps: [
      'Close bedroom windows and doors 1 hour before bedtime and run your purifier or DIY filter on high.',
      'Switch to low or sleep mode at bedtime so it runs quietly all night.',
      'Keep the filter at least 1 foot away from curtains and walls for smooth airflow.',
    ],
    indoorPm25ReductionFraction: 0.24,
    dailyCo2eSavedGrams: 0,
    dailyLocalPm25SavedMg: 0,
    dailySavingsInr: 0,
    directImpactExplanation:
      'Keeping bedroom air clean for 8 hours overnight cuts total daily smoke inhaled by about one-third and helps older lungs recover during sleep.',
    origin: 'evidence-catalog',
  },
  {
    id: 'alt-transit-carpool-swap',
    title: 'Use Metro, CNG auto, or society carpool 3 days a week',
    category: 'sustainable_alt',
    timeSlot: 'morning',
    costTier: 'Free',
    difficulty: 'Moderate',
    summary:
      'Share office or school runs with 2 families in your RWA society—or take the Metro—on severe winter smog weekdays.',
    steps: [
      'Post in your apartment RWA WhatsApp group to pair with 2 neighbours on the same office or school route.',
      'Check AQI at night; choose Metro or carpool whenever next-day AQI crosses 150.',
      'Carry a snug N95 mask for short walks to Metro stations or bus stops.',
    ],
    indoorPm25ReductionFraction: 0.04,
    dailyCo2eSavedGrams: 2650,
    dailyLocalPm25SavedMg: 142,
    dailySavingsInr: 95,
    directImpactExplanation:
      'Skipping solo petrol drives cuts street-level exhaust near homes and schools while saving roughly ₹2,800 per month on fuel.',
    relevantTo: {
      commuteModes: ['petrol_car', 'diesel_suv', 'two_wheeler'],
    },
    origin: 'evidence-catalog',
  },
  {
    id: 'alt-electric-cooking-kettle',
    title: 'Boil water, tea & dal using electric kettle or induction',
    category: 'sustainable_alt',
    timeSlot: 'anytime',
    costTier: 'Low Cost',
    difficulty: 'Easy',
    summary:
      'Use an electric kettle, rice cooker, or portable induction cooktop (from ₹1,500) to reduce open LPG gas flames in closed winter kitchens.',
    steps: [
      'Use an electric kettle for morning chai water and drinking warm water instead of the gas burner.',
      'Cook rice, dal, or khichdi on an induction stove or electric pressure cooker when windows are closed.',
      'Always turn on the kitchen chimney or exhaust fan whenever using the LPG/PNG stove.',
    ],
    indoorPm25ReductionFraction: 0.2,
    dailyCo2eSavedGrams: 890,
    dailyLocalPm25SavedMg: 54,
    dailySavingsInr: 22,
    directImpactExplanation:
      'Open LPG flames release nitrogen dioxide (NO2) inside closed winter flats; electric boiling keeps kitchen air cleaner and stretches your LPG cylinder longer.',
    relevantTo: {
      cookingFuels: ['gas_stove', 'solid_biomass'],
    },
    origin: 'evidence-catalog',
  },
  {
    id: 'alt-lower-thermostat-insulate',
    title: 'Stop outdoor leaf/angithi burning & use warm layers indoors',
    category: 'sustainable_alt',
    timeSlot: 'evening',
    costTier: 'Free',
    difficulty: 'Easy',
    summary:
      'Ask society guards to use electric heaters or warm jackets instead of coal/wood bonfires (angithi), and draw thick curtains at sunset.',
    steps: [
      'Close heavy curtains by 5:30 PM to keep rooms naturally warmer without extra heating.',
      'Coordinate with your RWA to provide safe electric heaters or thermal coats for night guards instead of wood bonfires.',
      'If heating a room, use an oil-filled electric radiator only in the occupied room.',
    ],
    indoorPm25ReductionFraction: 0.12,
    dailyCo2eSavedGrams: 3100,
    dailyLocalPm25SavedMg: 210,
    dailySavingsInr: 35,
    directImpactExplanation:
      'Open wood, dry-leaf, and coal fires around apartment gates create thick local smoke clouds that drift straight into ground and upper-floor flats.',
    relevantTo: {
      heatingFuels: ['wood_coal', 'gas_furnace', 'kerosene_lpg', 'minimal_heating'],
    },
    origin: 'evidence-catalog',
  },
];

/**
 * Estimates baseline indoor PM2.5 before selected interventions, factoring outdoor infiltration
 * and indoor combustion sources (cooking, heating, existing purifier).
 */
export function estimateBaselineIndoorPm25(
  outdoorPm25: number,
  profile: HouseholdProfile,
): number {
  const safeOutdoor = Math.max(0, Number.isFinite(outdoorPm25) ? outdoorPm25 : 0);

  const infiltrationFactor =
    profile.homeType === 'apartment'
      ? 0.62
      : profile.homeType === 'shared_building'
        ? 0.66
        : 0.7;

  const cookingPenalty =
    profile.cookingFuel === 'solid_biomass'
      ? 42
      : profile.cookingFuel === 'gas_stove'
        ? 11
        : 1.5;

  const heatingPenalty =
    profile.heatingFuel === 'wood_coal'
      ? 34
      : profile.heatingFuel === 'kerosene_lpg'
        ? 18
        : profile.heatingFuel === 'gas_furnace'
          ? 5
          : 0;

  const existingPurifierFactor =
    profile.purifierAccess === 'hepa_unit'
      ? 0.72
      : profile.purifierAccess === 'diy_corsi_rosenthal'
        ? 0.76
        : 1.0;

  const rawIndoor =
    (safeOutdoor * infiltrationFactor + cookingPenalty + heatingPenalty) *
    existingPurifierFactor;

  return Math.round(Math.max(2, rawIndoor) * 10) / 10;
}

/**
 * Calculates household and community-scaled direct impacts (including INR savings) for enabled actions.
 */
export function calculateHouseholdImpact(
  profile: HouseholdProfile,
  snapshot: AirQualitySnapshot,
  selectedActionIds: string[],
  catalog: SmogAction[],
): ImpactMetrics {
  const selectedSet = new Set(selectedActionIds);
  const activeActions = catalog.filter((action) => selectedSet.has(action.id));

  const baselineIndoorPm25 = estimateBaselineIndoorPm25(snapshot.pm25, profile);

  let remainingFraction = 1.0;
  let dailyCo2eGrams = 0;
  let dailyPm25Mg = 0;
  let dailyInrSaved = 0;

  const commuteScale = Math.max(0.5, Math.min(2.5, profile.dailyCommuteKm / 18));
  const householdScale = Math.max(0.7, Math.min(2.2, profile.householdSize / 3.5));

  for (const action of activeActions) {
    const safeReduction = Math.min(0.65, Math.max(0, action.indoorPm25ReductionFraction));
    remainingFraction *= 1 - safeReduction;

    const scale =
      action.relevantTo?.commuteModes && action.relevantTo.commuteModes.length > 0
        ? commuteScale
        : householdScale;

    dailyCo2eGrams += Math.max(0, action.dailyCo2eSavedGrams) * scale;
    dailyPm25Mg += Math.max(0, action.dailyLocalPm25SavedMg) * scale;
    dailyInrSaved += Math.max(0, action.dailySavingsInr ?? 0) * scale;
  }

  const totalReductionFraction = Math.min(0.85, Math.max(0, 1 - remainingFraction));
  const projectedIndoorPm25 =
    Math.round(Math.max(2, baselineIndoorPm25 * (1 - totalReductionFraction)) * 10) / 10;

  const pm25Avoided = Math.max(0, baselineIndoorPm25 - projectedIndoorPm25);
  const indoorPm25ReductionPct =
    baselineIndoorPm25 > 0
      ? Math.round((pm25Avoided / baselineIndoorPm25) * 100)
      : 0;

  const cigaretteEquivalentsAvoidedPerDay =
    Math.round((pm25Avoided / 22) * 10) / 10;

  const dailyCo2eSavedKg = Math.round((dailyCo2eGrams / 1000) * 100) / 100;
  const monthlyCo2eSavedKg = Math.round(dailyCo2eSavedKg * 30 * 10) / 10;

  const dailyLocalPm25SavedGrams = Math.round((dailyPm25Mg / 1000) * 1000) / 1000;
  const monthlyLocalPm25SavedGrams =
    Math.round(dailyLocalPm25SavedGrams * 30 * 100) / 100;

  const monthlySavingsInr = Math.round(dailyInrSaved * 30);

  const households = Math.max(1, Math.round(profile.communityHouseholds));
  const communityMonthlySavingsInr = Math.round(monthlySavingsInr * households);
  const communityMonthlyCo2eSavedKg =
    Math.round(monthlyCo2eSavedKg * households * 10) / 10;
  const communityMonthlyPm25SavedGrams =
    Math.round(monthlyLocalPm25SavedGrams * households * 10) / 10;

  const equivalentWinterCarTripsAvoidedPerMonth = Math.round(
    communityMonthlyCo2eSavedKg / 3.1,
  );

  return {
    baselineIndoorPm25,
    projectedIndoorPm25,
    indoorPm25ReductionPct,
    cigaretteEquivalentsAvoidedPerDay,
    dailyCo2eSavedKg,
    monthlyCo2eSavedKg,
    dailyLocalPm25SavedGrams,
    monthlyLocalPm25SavedGrams,
    monthlySavingsInr,
    communityMonthlySavingsInr,
    communityMonthlyCo2eSavedKg,
    communityMonthlyPm25SavedGrams,
    equivalentWinterCarTripsAvoidedPerMonth,
    activeActionCount: activeActions.length,
  };
}

/**
 * Ranks actions by relevance to the household's fuel, commute, purifier setup, and local AQI.
 */
export function rankActionsForProfile(
  actions: SmogAction[],
  profile: HouseholdProfile,
  snapshot: AirQualitySnapshot,
): SmogAction[] {
  return [...actions].sort((a, b) => {
    if (a.origin !== b.origin) {
      return a.origin === 'gemini-tailored' ? -1 : 1;
    }
    const score = (item: SmogAction): number => {
      let s = item.indoorPm25ReductionFraction * 100 + item.dailyCo2eSavedGrams / 80;
      if (item.relevantTo?.commuteModes?.includes(profile.commuteMode)) s += 25;
      if (item.relevantTo?.heatingFuels?.includes(profile.heatingFuel)) s += 25;
      if (item.relevantTo?.cookingFuels?.includes(profile.cookingFuel)) s += 25;
      if (item.relevantTo?.purifierAccess?.includes(profile.purifierAccess)) s += 20;
      if (snapshot.usAqi >= 150 && item.category === 'indoor_hack') s += 18;
      return s;
    };
    return score(b) - score(a);
  });
}
