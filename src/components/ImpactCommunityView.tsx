import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { formatInr } from '../domain/impactCalculator';
import type {
  AiActionPlan,
  AirQualitySnapshot,
  HouseholdProfile,
  ImpactMetrics,
  SmogAction,
} from '../domain/types';

interface ImpactCommunityViewProps {
  snapshot: AirQualitySnapshot;
  profile: HouseholdProfile;
  impact: ImpactMetrics;
  activeActions: SmogAction[];
  aiPlan: AiActionPlan | null;
  onUpdateCommunityHouseholds: (count: number) => void;
}

export function ImpactCommunityView({
  snapshot,
  profile,
  impact,
  activeActions,
  aiPlan,
  onUpdateCommunityHouseholds,
}: ImpactCommunityViewProps) {
  const [copied, setCopied] = useState(false);

  const maxBarValue = Math.max(
    60,
    snapshot.pm25,
    impact.baselineIndoorPm25,
    impact.projectedIndoorPm25,
  );

  const pctWidth = (value: number): string =>
    `${Math.max(4, Math.min(100, Math.round((value / maxBarValue) * 100)))}%`;

  const communityBriefText =
    aiPlan?.communityBrief ??
    `Namaste neighbours — Air quality in ${snapshot.city.name} is AQI ${snapshot.usAqi} (PM2.5 ${snapshot.pm25} µg/m³) today. Our society families are following ${impact.activeActionCount} simple steps: turning off car engines at the gate, pausing outdoor leaf/angithi fires, and sharing Metro/school rides. If ${profile.communityHouseholds} flats join in, our society prevents ${impact.communityMonthlyCo2eSavedKg.toLocaleString('en-IN')} kg CO2e, cuts ${impact.communityMonthlyPm25SavedGrams.toLocaleString('en-IN')} g of local smoke, and saves roughly ${formatInr(impact.communityMonthlySavingsInr)} per month on fuel and energy.`;

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(communityBriefText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Personal Indoor Air & Savings Impact */}
        <section
          aria-labelledby="exposure-comparison-heading"
          className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <h2
              id="exposure-comparison-heading"
              className="text-lg font-semibold text-slate-900"
            >
              How Your Choices Clean Your Home Air
            </h2>
            <p className="text-sm text-slate-700 mt-1">
              Based on your {impact.activeActionCount} active daily steps in{' '}
              {snapshot.city.name}.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">
                    Outside air ({snapshot.city.name})
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {snapshot.pm25} µg/m³
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-slate-500 rounded transition-all duration-200"
                    style={{ width: pctWidth(snapshot.pm25) }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">
                    Inside home before your steps
                  </span>
                  <span className="font-mono font-semibold text-amber-800 tabular-nums">
                    {impact.baselineIndoorPm25} µg/m³
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded transition-all duration-200"
                    style={{ width: pctWidth(impact.baselineIndoorPm25) }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="font-semibold text-slate-900">
                    Inside home with your active steps
                  </span>
                  <span className="font-mono font-semibold text-teal-800 tabular-nums">
                    {impact.projectedIndoorPm25} µg/m³ (-{impact.indoorPm25ReductionPct}%)
                  </span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded transition-all duration-200"
                    style={{ width: pctWidth(impact.projectedIndoorPm25) }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="text-slate-600">
                    WHO safe indoor clean-air goal
                  </span>
                  <span className="font-mono text-emerald-700 font-medium tabular-nums">
                    15.0 µg/m³
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded"
                    style={{ width: pctWidth(15) }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600">
                Smoke kept out of lungs daily
              </div>
              <div className="text-xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
                {impact.cigaretteEquivalentsAvoidedPerDay} cig eq./person
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Every 22 µg/m³ drop equals ~1 fewer cigarette smoked daily
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">
                Estimated family fuel &amp; LPG savings
              </div>
              <div className="text-xl font-mono font-semibold text-teal-800 tabular-nums mt-1">
                {formatInr(impact.monthlySavingsInr)} / month
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Plus {impact.monthlyCo2eSavedKg} kg CO2e avoided each month
              </div>
            </div>
          </div>
        </section>

        {/* Society / RWA Collective Impact */}
        <section
          aria-labelledby="community-ripple-heading"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col justify-between"
        >
          <div>
            <h2
              id="community-ripple-heading"
              className="text-lg font-semibold text-slate-900"
            >
              RWA &amp; Society Collective Impact
            </h2>
            <p className="text-sm text-slate-700 mt-1">
              Slide to see the combined cleaner air and ₹ savings when neighbours in your society follow these steps together.
            </p>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="community-households-slider"
                  className="text-sm font-medium text-slate-800"
                >
                  Participating society flats
                </label>
                <span className="text-base font-mono font-semibold text-teal-800 tabular-nums">
                  {profile.communityHouseholds} flats
                </span>
              </div>
              <input
                id="community-households-slider"
                type="range"
                min={1}
                max={500}
                step={1}
                value={profile.communityHouseholds}
                onChange={(e) =>
                  onUpdateCommunityHouseholds(Number(e.target.value))
                }
                className="w-full h-3 accent-teal-700 cursor-pointer"
              />
              <div className="flex justify-between text-xs font-mono text-slate-600 tabular-nums mt-1.5">
                <span>1 home</span>
                <span>50 block</span>
                <span>250 society</span>
                <span>500 ward</span>
              </div>
            </div>

            <dl className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
              <div className="py-3 flex items-baseline justify-between gap-2">
                <dt className="text-sm text-slate-700">
                  Society monthly fuel/LPG savings
                </dt>
                <dd className="text-base font-mono font-semibold text-teal-800 tabular-nums">
                  {formatInr(impact.communityMonthlySavingsInr)}
                </dd>
              </div>
              <div className="py-3 flex items-baseline justify-between gap-2">
                <dt className="text-sm text-slate-700">
                  Monthly CO2e prevented together
                </dt>
                <dd className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                  {impact.communityMonthlyCo2eSavedKg.toLocaleString('en-IN')} kg
                </dd>
              </div>
              <div className="py-3 flex items-baseline justify-between gap-2">
                <dt className="text-sm text-slate-700">
                  Local winter smoke prevented
                </dt>
                <dd className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                  {impact.communityMonthlyPm25SavedGrams.toLocaleString('en-IN')} g
                </dd>
              </div>
              <div className="py-3 flex items-baseline justify-between gap-2">
                <dt className="text-sm text-slate-700">
                  Winter car trips avoided
                </dt>
                <dd className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                  {impact.equivalentWinterCarTripsAvoidedPerMonth.toLocaleString('en-IN')}{' '}
                  trips/mo
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h3 className="text-sm font-semibold text-slate-900">
                WhatsApp Message for Your RWA Group
              </h3>
              <button
                type="button"
                onClick={handleCopyBrief}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-teal-700" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Copy Text
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3.5">
              {communityBriefText}
            </p>
          </div>
        </section>
      </div>

      {/* Action-by-Action Quantitative Ledger */}
      <section
        aria-labelledby="impact-ledger-heading"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="p-5 sm:p-6 border-b border-slate-200">
          <h2
            id="impact-ledger-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Breakdown of Your Active Steps
          </h2>
          <p className="text-sm text-slate-700 mt-1">
            Exact air cleaning and monthly ₹ savings from each step you turned on.
          </p>
        </div>

        {activeActions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-700">
            No steps are turned on yet. Tick a few habits under Daily Routine or Indoor Air Tips to see your family’s impact.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700">
                  <th scope="col" className="py-3.5 px-5">
                    Active Step
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Category
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    Indoor Smoke Cut
                  </th>
                  <th scope="col" className="py-3.5 px-4 text-right">
                    Monthly Savings
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-right">
                    Daily CO2e Saved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {activeActions.map((action) => (
                  <tr key={action.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      {action.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {action.category === 'routine'
                        ? 'Daily Routine'
                        : action.category === 'indoor_hack'
                          ? 'Indoor Tip'
                          : 'Cleaner Habit'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-teal-800 font-medium">
                      -{Math.round(action.indoorPm25ReductionFraction * 100)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {formatInr((action.dailySavingsInr ?? 0) * 30)}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums text-slate-700">
                      {(action.dailyCo2eSavedGrams / 1000).toFixed(2)} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
