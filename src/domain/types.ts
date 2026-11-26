export type SensitiveGroup = 'children' | 'seniors' | 'asthma' | 'pregnancy';

export type CommuteMode =
  | 'petrol_car'
  | 'diesel_suv'
  | 'two_wheeler'
  | 'public_transit'
  | 'walk_cycle'
  | 'remote_work';

export type HeatingFuel =
  | 'wood_coal'
  | 'gas_furnace'
  | 'electric_heat_pump'
  | 'kerosene_lpg'
  | 'minimal_heating';

export type CookingFuel = 'gas_stove' | 'induction_electric' | 'solid_biomass';

export type PurifierAccess = 'none' | 'hepa_unit' | 'diy_corsi_rosenthal';

export type HomeType = 'apartment' | 'detached_house' | 'shared_building';

export interface CityLocation {
  id: string;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  winterNote: string;
}

export interface HourlyAirPoint {
  hourLabel: string;
  isoTime: string;
  pm25: number;
  pm10: number;
  usAqi: number;
  windKmh: number;
  tempC: number;
}

export interface AirQualitySnapshot {
  city: CityLocation;
  source: 'open-meteo-live' | 'seasonal-baseline';
  updatedAt: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  tempC: number;
  windKmh: number;
  humidityPct: number;
  hourly: HourlyAirPoint[];
}

export interface AqiCategoryInfo {
  level:
    | 'good'
    | 'moderate'
    | 'sensitive'
    | 'unhealthy'
    | 'very_unhealthy'
    | 'hazardous';
  label: string;
  shortLabel: string;
  summary: string;
  textClass: string;
  accentHex: string;
  barClass: string;
}

export interface InversionRiskAssessment {
  level: 'Low' | 'Elevated' | 'High' | 'Severe';
  score: number;
  explanation: string;
  peakTrapHours: string;
}

export interface VentilationWindow {
  startHour: string;
  endHour: string;
  avgPm25: number;
  avgAqi: number;
  recommendedMinutes: number;
  advisory: string;
  isSafeToOpen: boolean;
}

export interface HouseholdProfile {
  householdSize: number;
  homeType: HomeType;
  commuteMode: CommuteMode;
  dailyCommuteKm: number;
  heatingFuel: HeatingFuel;
  cookingFuel: CookingFuel;
  purifierAccess: PurifierAccess;
  sensitiveGroups: SensitiveGroup[];
  communityHouseholds: number;
}

export type ActionCategory = 'routine' | 'indoor_hack' | 'sustainable_alt';
export type TimeSlot = 'morning' | 'midday' | 'evening' | 'anytime';
export type CostTier = 'Free' | 'Low Cost' | 'Investment';

export interface SmogAction {
  id: string;
  title: string;
  category: ActionCategory;
  timeSlot: TimeSlot;
  costTier: CostTier;
  difficulty: 'Easy' | 'Moderate' | 'Community';
  summary: string;
  steps: string[];
  /** Fractional reduction in indoor PM2.5 infiltration or generation (0 to 0.65) */
  indoorPm25ReductionFraction: number;
  /** Grams of CO2e avoided per household per day */
  dailyCo2eSavedGrams: number;
  /** Milligrams of local urban PM2.5 prevented per household per day */
  dailyLocalPm25SavedMg: number;
  /** Estimated household fuel/electricity savings in Indian Rupees (INR) per day */
  dailySavingsInr: number;
  /** Direct, human-readable explanation of why this choice changes outcomes */
  directImpactExplanation: string;
  /** Optional profile relevance tags */
  relevantTo?: {
    commuteModes?: CommuteMode[];
    heatingFuels?: HeatingFuel[];
    cookingFuels?: CookingFuel[];
    purifierAccess?: PurifierAccess[];
    minAqi?: number;
  };
  origin: 'evidence-catalog' | 'gemini-tailored';
}

export interface ImpactMetrics {
  baselineIndoorPm25: number;
  projectedIndoorPm25: number;
  indoorPm25ReductionPct: number;
  cigaretteEquivalentsAvoidedPerDay: number;
  dailyCo2eSavedKg: number;
  monthlyCo2eSavedKg: number;
  dailyLocalPm25SavedGrams: number;
  monthlyLocalPm25SavedGrams: number;
  monthlySavingsInr: number;
  communityMonthlySavingsInr: number;
  communityMonthlyCo2eSavedKg: number;
  communityMonthlyPm25SavedGrams: number;
  equivalentWinterCarTripsAvoidedPerMonth: number;
  activeActionCount: number;
}

export interface AiActionPlan {
  generatedAt: string;
  headline: string;
  locationContextSummary: string;
  ventilationGuidance: string;
  actions: SmogAction[];
  communityBrief: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type DashboardTab =
  | 'overview'
  | 'routines'
  | 'indoor'
  | 'impact'
  | 'advisor';
