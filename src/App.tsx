import {
  CalendarCheck,
  Home,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquareText,
  Sparkles,
  TrendingDown,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionCardList } from './components/ActionCardList';
import { HourlySmogChart } from './components/HourlySmogChart';
import { HouseholdProfilePanel } from './components/HouseholdProfilePanel';
import { ImpactCommunityView } from './components/ImpactCommunityView';
import { IndoorHacksGuide } from './components/IndoorHacksGuide';
import { LocationSelectorModal } from './components/LocationSelectorModal';
import { SmogAdvisorChat } from './components/SmogAdvisorChat';
import {
  buildSeasonalBaselineSnapshot,
  calculateInversionRisk,
  findBestVentilationWindow,
  getAqiCategory,
  getHouseholdHealthGuidance,
  getSimpleDailyHeadline,
  PRESET_CITIES,
} from './domain/airQuality';
import {
  calculateHouseholdImpact,
  DEFAULT_HOUSEHOLD_PROFILE,
  DEFAULT_SMOG_ACTIONS,
  formatInr,
  rankActionsForProfile,
} from './domain/impactCalculator';
import type {
  AiActionPlan,
  AirQualitySnapshot,
  CityLocation,
  DashboardTab,
  HouseholdProfile,
  SmogAction,
} from './domain/types';
import {
  buildAirQualityContext,
  fetchCityAirQuality,
  generateAiSmogPlan,
} from './services/api';

const STORAGE_KEYS = {
  city: 'clearair_city_in_v2',
  profile: 'clearair_profile_in_v2',
  selectedIds: 'clearair_selected_actions_in_v2',
  largeText: 'clearair_large_text_v1',
} as const;

const DEFAULT_SELECTED_IDS = [
  'routine-afternoon-ventilation',
  'hack-corsi-rosenthal-box',
  'alt-electric-cooking-kettle',
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const NAV_ITEMS: Array<{
  id: DashboardTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Home Overview', icon: LayoutDashboard },
  { id: 'routines', label: 'Daily Routine', icon: CalendarCheck },
  { id: 'indoor', label: 'Indoor Air Tips', icon: Home },
  { id: 'impact', label: 'Impact & Savings', icon: TrendingDown },
  { id: 'advisor', label: 'Ask Advisor', icon: MessageSquareText },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [largeText, setLargeText] = useState<boolean>(() =>
    readStorage<boolean>(STORAGE_KEYS.largeText, false),
  );
  const [city, setCity] = useState<CityLocation>(() =>
    readStorage<CityLocation>(STORAGE_KEYS.city, PRESET_CITIES[0]),
  );
  const [profile, setProfile] = useState<HouseholdProfile>(() =>
    readStorage<HouseholdProfile>(STORAGE_KEYS.profile, DEFAULT_HOUSEHOLD_PROFILE),
  );
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.selectedIds, DEFAULT_SELECTED_IDS),
  );

  const [snapshot, setSnapshot] = useState<AirQualitySnapshot>(() =>
    buildSeasonalBaselineSnapshot(city),
  );
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  const [aiPlan, setAiPlan] = useState<AiActionPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [liveStatusAnnouncement, setLiveStatusAnnouncement] = useState('');

  // Sync senior-friendly text scale to root html element
  useEffect(() => {
    document.documentElement.classList.toggle('text-scale-large', largeText);
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.largeText,
        JSON.stringify(largeText),
      );
    } catch {
      // Ignore storage restrictions
    }
  }, [largeText]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.city, JSON.stringify(city));
    } catch {
      // Ignore storage quota restrictions
    }
  }, [city]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch {
      // Ignore storage quota restrictions
    }
  }, [profile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.selectedIds,
        JSON.stringify(selectedActionIds),
      );
    } catch {
      // Ignore storage quota restrictions
    }
  }, [selectedActionIds]);

  // Fetch live air quality telemetry whenever selected city changes
  useEffect(() => {
    let cancelled = false;
    setIsLoadingTelemetry(true);
    setTelemetryError(null);

    fetchCityAirQuality(city)
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setLiveStatusAnnouncement(
          `Air quality updated for ${data.city.name}: AQI ${data.usAqi}, PM2.5 ${data.pm25} micrograms per cubic meter.`,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setSnapshot(buildSeasonalBaselineSnapshot(city));
        setTelemetryError(
          err instanceof Error
            ? err.message
            : 'Using seasonal winter baseline while live telemetry reconnects.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTelemetry(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  const aqiInfo = useMemo(
    () => getAqiCategory(snapshot.usAqi),
    [snapshot.usAqi],
  );

  const inversion = useMemo(
    () =>
      calculateInversionRisk({
        windKmh: snapshot.windKmh,
        tempC: snapshot.tempC,
        humidityPct: snapshot.humidityPct,
        pm25: snapshot.pm25,
      }),
    [snapshot.windKmh, snapshot.tempC, snapshot.humidityPct, snapshot.pm25],
  );

  const ventilation = useMemo(
    () => findBestVentilationWindow(snapshot.hourly),
    [snapshot.hourly],
  );

  const simpleDailySummary = useMemo(
    () => getSimpleDailyHeadline(snapshot.usAqi, city.name, ventilation),
    [snapshot.usAqi, city.name, ventilation],
  );

  const healthGuidance = useMemo(
    () => getHouseholdHealthGuidance(snapshot.usAqi, profile),
    [snapshot.usAqi, profile],
  );

  const allActions: SmogAction[] = useMemo(() => {
    const merged = aiPlan
      ? [...aiPlan.actions, ...DEFAULT_SMOG_ACTIONS]
      : DEFAULT_SMOG_ACTIONS;
    return rankActionsForProfile(merged, profile, snapshot);
  }, [aiPlan, profile, snapshot]);

  const impact = useMemo(
    () =>
      calculateHouseholdImpact(profile, snapshot, selectedActionIds, allActions),
    [profile, snapshot, selectedActionIds, allActions],
  );

  const activeActionsList = useMemo(() => {
    const set = new Set(selectedActionIds);
    return allActions.filter((a) => set.has(a.id));
  }, [allActions, selectedActionIds]);

  const routineAndAltActions = useMemo(
    () =>
      allActions.filter(
        (a) => a.category === 'routine' || a.category === 'sustainable_alt',
      ),
    [allActions],
  );

  const indoorHackActions = useMemo(
    () => allActions.filter((a) => a.category === 'indoor_hack'),
    [allActions],
  );

  const toggleActionSelection = useCallback((actionId: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId],
    );
  }, []);

  const handleGenerateAiPlan = async () => {
    if (isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    setAiError(null);
    setLiveStatusAnnouncement(
      `Preparing tailored winter air plan for ${snapshot.city.name}.`,
    );
    try {
      const generated = await generateAiSmogPlan({
        profile,
        airQuality: buildAirQualityContext(snapshot, inversion, ventilation),
      });
      setAiPlan(generated);
      const topAiIds = generated.actions.slice(0, 2).map((a) => a.id);
      setSelectedActionIds((prev) => Array.from(new Set([...topAiIds, ...prev])));
      setLiveStatusAnnouncement(
        `Your family plan is ready with ${generated.actions.length} steps for ${snapshot.city.name}.`,
      );
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Unable to prepare your AI plan right now.',
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSelectTab = useCallback((nextTab: DashboardTab) => {
    setActiveTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const activeNavLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Home Overview';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Skip-to-content accessibility link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-teal-700 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Accessible screen-reader status announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveStatusAnnouncement}
      </div>

      {/* Desktop Sidebar Navigation */}
      <aside
        aria-label="Primary navigation"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen"
      >
        <div className="h-14 px-5 flex items-center border-b border-slate-200">
          <span className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap">
            ClearAir Winter
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1.5" aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[46px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Senior-Friendly Text Size Control & Quick Family Summary */}
        <div className="p-4 border-t border-slate-200 space-y-4">
          <button
            type="button"
            onClick={() => setLargeText((prev) => !prev)}
            aria-pressed={largeText}
            className={`w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-sm font-medium rounded-md border transition-colors cursor-pointer ${
              largeText
                ? 'bg-teal-50 border-teal-300 text-teal-900'
                : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <TypeIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Larger Text</span>
            </span>
            <span className="text-xs font-mono font-semibold">
              {largeText ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="text-xs text-slate-700 space-y-2">
            <div className="font-semibold text-slate-900 text-sm">Your Home</div>
            <div className="flex items-center justify-between">
              <span>City</span>
              <span className="font-medium text-slate-900 truncate max-w-[130px]">
                {city.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Indoor Smoke Cut</span>
              <span className="font-mono tabular-nums text-teal-800 font-semibold">
                -{impact.indoorPm25ReductionPct}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Monthly Savings</span>
              <span className="font-mono tabular-nums text-slate-900 font-semibold">
                {formatInr(impact.monthlySavingsInr)}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="text-lg font-bold text-slate-900 font-display">
                ClearAir Winter
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="p-2.5 text-slate-600 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleSelectTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-[48px] flex items-center gap-3 px-3.5 py-3 text-base font-medium rounded-md transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setLargeText((prev) => !prev)}
                aria-pressed={largeText}
                className={`w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between text-sm font-medium rounded-md border cursor-pointer ${
                  largeText
                    ? 'bg-teal-50 border-teal-300 text-teal-900'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <TypeIcon className="w-4 h-4" aria-hidden="true" />
                  <span>Larger Text</span>
                </span>
                <span className="font-mono font-semibold">
                  {largeText ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, City selector + 1 Primary CTA on right */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-md cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm sm:text-base min-w-0">
              <span
                className="text-slate-500 hidden sm:inline whitespace-nowrap"
                aria-hidden="true"
              >
                ClearAir Winter
              </span>
              <span
                className="text-slate-300 hidden sm:inline"
                aria-hidden="true"
              >
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">
                {activeNavLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              aria-label={`Change city, currently ${city.name}`}
              className="h-10 px-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:text-slate-950 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MapPin
                className="w-4 h-4 text-teal-700 shrink-0"
                aria-hidden="true"
              />
              <span className="max-w-[88px] sm:max-w-[160px] truncate">
                {city.name}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleGenerateAiPlan()}
              disabled={isGeneratingPlan}
              className="h-10 px-3.5 sm:px-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="sm:hidden">
                {isGeneratingPlan ? 'Working...' : 'Get Plan'}
              </span>
              <span className="hidden sm:inline">
                {isGeneratingPlan ? 'Preparing Plan...' : 'Get Today’s Plan'}
              </span>
            </button>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 space-y-6"
        >
          {/* Error alerts */}
          {aiError && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-4 text-sm text-red-900"
            >
              <div>
                <span className="font-semibold">AI Plan Notice: </span>
                {aiError}
              </div>
              <button
                type="button"
                onClick={() => setAiError(null)}
                aria-label="Dismiss AI error alert"
                className="p-1.5 text-red-800 hover:text-red-950 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {telemetryError && (
            <div
              role="status"
              className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900"
            >
              {telemetryError}
            </div>
          )}

          {/* Home Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Senior-Friendly Plain-Language Daily Summary Card */}
              <section
                aria-labelledby="simple-advice-heading"
                className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold text-teal-800 tracking-wide">
                    Today’s Simple Advice for Your Family
                  </div>
                  <h2
                    id="simple-advice-heading"
                    className="text-xl font-semibold text-slate-900 mt-1"
                  >
                    {simpleDailySummary.title}
                  </h2>
                  <p className="text-base text-slate-800 mt-2 leading-relaxed">
                    {simpleDailySummary.advice}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('routines')}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    View Daily Routine
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('advisor')}
                    className="min-h-[44px] px-4 py-2 text-sm font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md whitespace-nowrap cursor-pointer"
                  >
                    Ask a Question
                  </button>
                </div>
              </section>

              {/* 4-Column High-Legibility KPI Strip */}
              <section
                aria-label="Current air quality and household impact summary"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Air Quality Today</span>
                    <span className="font-mono text-xs tabular-nums">
                      {snapshot.source === 'open-meteo-live' ? 'Live' : 'Baseline'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span
                      data-testid="kpi-aqi-value"
                      className="text-3xl font-mono font-semibold text-slate-900 tabular-nums"
                    >
                      {isLoadingTelemetry ? '—' : snapshot.usAqi}
                    </span>
                    <span className={`text-sm font-semibold ${aqiInfo.textClass}`}>
                      {aqiInfo.shortLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700 font-mono tabular-nums">
                    PM2.5 {snapshot.pm25} µg/m³ · PM10 {snapshot.pm10}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-sm text-slate-600">
                    Indoor Air After Steps
                  </div>
                  <div className="mt-2 flex items-baseline gap-2.5">
                    <span
                      data-testid="kpi-indoor-pm25"
                      className="text-3xl font-mono font-semibold text-slate-900 tabular-nums"
                    >
                      {impact.projectedIndoorPm25}
                    </span>
                    <span className="text-sm font-mono font-semibold text-teal-800 tabular-nums">
                      -{impact.indoorPm25ReductionPct}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700 font-mono tabular-nums">
                    Down from {impact.baselineIndoorPm25} µg/m³ ·{' '}
                    {impact.activeActionCount} active steps
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-sm text-slate-600">
                    Best Window to Air Rooms
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-semibold text-slate-900 tabular-nums">
                      {ventilation.startHour}–{ventilation.endHour}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700">
                    {ventilation.isSafeToOpen
                      ? `Open windows up to ${ventilation.recommendedMinutes} min`
                      : 'Keep windows closed today'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-sm text-slate-600">
                    Society Monthly Savings
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      data-testid="kpi-community-savings"
                      className="text-3xl font-mono font-semibold text-teal-800 tabular-nums"
                    >
                      {formatInr(impact.communityMonthlySavingsInr)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700 font-mono tabular-nums">
                    {formatInr(impact.monthlySavingsInr)}/home ·{' '}
                    {impact.communityMonthlyCo2eSavedKg.toLocaleString('en-IN')} kg CO2e
                  </p>
                </div>
              </section>

              {/* GenAI Tailored Briefing (appears when user generates AI plan) */}
              {aiPlan && (
                <section
                  aria-labelledby="ai-briefing-heading"
                  className="bg-white border border-teal-300 rounded-lg p-5 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <h2
                      id="ai-briefing-heading"
                      className="text-lg font-semibold text-slate-900"
                    >
                      {aiPlan.headline}
                    </h2>
                    <span className="text-xs text-teal-800 font-semibold whitespace-nowrap">
                      Tailored for {city.name}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm text-slate-800 leading-relaxed">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">
                        Why the Air Is Like This Today
                      </div>
                      <p>{aiPlan.locationContextSummary}</p>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">
                        When to Open or Close Windows
                      </div>
                      <p>{aiPlan.ventilationGuidance}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Primary Analytical Split: Hourly Smog Curve + Family Health Care */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-8">
                  <HourlySmogChart
                    hourly={snapshot.hourly}
                    ventilation={ventilation}
                    cityName={city.name}
                  />
                </div>

                <section
                  aria-labelledby="safeguards-heading"
                  className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    <h2
                      id="safeguards-heading"
                      className="text-lg font-semibold text-slate-900"
                    >
                      Health Care Checklist
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {aqiInfo.label} (AQI {snapshot.usAqi}) · Smog traps most around{' '}
                      <span className="font-mono tabular-nums text-slate-800">
                        {inversion.peakTrapHours}
                      </span>
                    </p>

                    <ul className="mt-4 space-y-3 text-sm text-slate-800 list-disc pl-5 leading-relaxed">
                      {healthGuidance.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-700">
                      Have a family health question?
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('advisor')}
                      className="text-sm font-semibold text-teal-800 hover:text-teal-950 whitespace-nowrap cursor-pointer"
                    >
                      Ask Advisor →
                    </button>
                  </div>
                </section>
              </div>

              {/* Household Profile Editor */}
              <HouseholdProfilePanel profile={profile} onChange={setProfile} />

              {/* Prioritized Actions Preview */}
              <ActionCardList
                title="Recommended Daily Steps for Your Family"
                subtitle="Tick the steps you follow to immediately see cleaner indoor air and monthly ₹ savings."
                actions={allActions}
                selectedIds={selectedActionIds}
                onToggleSelect={toggleActionSelection}
                filterMode="category"
                isLoadingAi={isGeneratingPlan}
              />
            </>
          )}

          {/* Daily Routine Tab */}
          {activeTab === 'routines' && (
            <ActionCardList
              title="Low-Emission Daily Routine & Cleaner Habits"
              subtitle={`Timed around ${city.name} smog hours (${inversion.peakTrapHours}) and your family’s daily travel and kitchen setup.`}
              actions={routineAndAltActions}
              selectedIds={selectedActionIds}
              onToggleSelect={toggleActionSelection}
              filterMode="time"
              isLoadingAi={isGeneratingPlan}
            />
          )}

          {/* Indoor Air Tips Tab */}
          {activeTab === 'indoor' && (
            <IndoorHacksGuide
              actions={indoorHackActions}
              selectedIds={selectedActionIds}
              onToggleSelect={toggleActionSelection}
              isLoadingAi={isGeneratingPlan}
            />
          )}

          {/* Impact & Savings Tab */}
          {activeTab === 'impact' && (
            <ImpactCommunityView
              snapshot={snapshot}
              profile={profile}
              impact={impact}
              activeActions={activeActionsList}
              aiPlan={aiPlan}
              onUpdateCommunityHouseholds={(count) =>
                setProfile((prev) => ({ ...prev, communityHouseholds: count }))
              }
            />
          )}

          {/* Ask Advisor Tab */}
          {activeTab === 'advisor' && (
            <SmogAdvisorChat
              snapshot={snapshot}
              inversion={inversion}
              ventilation={ventilation}
              profile={profile}
            />
          )}
        </main>
      </div>

      <LocationSelectorModal
        isOpen={locationModalOpen}
        currentCity={city}
        onSelectCity={(nextCity) => setCity(nextCity)}
        onClose={() => setLocationModalOpen(false)}
      />
    </div>
  );
}
