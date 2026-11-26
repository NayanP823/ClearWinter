import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatInr } from '../domain/impactCalculator';
import type { ActionCategory, SmogAction } from '../domain/types';

interface ActionCardListProps {
  title: string;
  subtitle: string;
  actions: SmogAction[];
  selectedIds: string[];
  onToggleSelect: (actionId: string) => void;
  filterMode?: 'time' | 'cost' | 'category';
  isLoadingAi?: boolean;
}

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  routine: 'Daily Routine',
  indoor_hack: 'Indoor Air Tip',
  sustainable_alt: 'Cleaner Habit',
};

const TIME_LABELS: Record<SmogAction['timeSlot'], string> = {
  morning: 'Morning',
  midday: 'Afternoon',
  evening: 'Evening',
  anytime: 'All Day',
};

export function ActionCardList({
  title,
  subtitle,
  actions,
  selectedIds,
  onToggleSelect,
  filterMode = 'category',
  isLoadingAi = false,
}: ActionCardListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filterOptions = useMemo(() => {
    if (filterMode === 'time') {
      return [
        { id: 'all', label: 'All Times' },
        { id: 'morning', label: 'Morning' },
        { id: 'midday', label: 'Afternoon' },
        { id: 'evening', label: 'Evening' },
        { id: 'anytime', label: 'All Day' },
      ];
    }
    if (filterMode === 'cost') {
      return [
        { id: 'all', label: 'All Budgets' },
        { id: 'Free', label: 'Free (₹0)' },
        { id: 'Low Cost', label: 'Low Cost' },
        { id: 'Investment', label: 'Long-Term' },
      ];
    }
    return [
      { id: 'all', label: 'All Steps' },
      { id: 'routine', label: 'Daily Routine' },
      { id: 'indoor_hack', label: 'Indoor Air Tips' },
      { id: 'sustainable_alt', label: 'Cleaner Habits' },
    ];
  }, [filterMode]);

  const filteredActions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return actions.filter((action) => {
      if (activeFilter !== 'all') {
        if (filterMode === 'time' && action.timeSlot !== activeFilter) {
          return false;
        }
        if (filterMode === 'cost' && action.costTier !== activeFilter) {
          return false;
        }
        if (filterMode === 'category' && action.category !== activeFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        action.title.toLowerCase().includes(q) ||
        action.summary.toLowerCase().includes(q) ||
        action.directImpactExplanation.toLowerCase().includes(q)
      );
    });
  }, [actions, activeFilter, filterMode, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      aria-labelledby="action-list-heading"
      className="bg-white border border-slate-200 rounded-lg"
    >
      <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="action-list-heading"
              className="text-lg font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p className="text-sm text-slate-700 mt-1">{subtitle}</p>
          </div>
          <div className="text-sm font-mono text-slate-700 tabular-nums shrink-0 font-medium">
            {actions.filter((a) => selectedSet.has(a.id)).length} of{' '}
            {actions.length} ticked
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter recommendations"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md"
          >
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveFilter(opt.id)}
                  aria-pressed={isActive}
                  className={`min-h-[38px] px-3.5 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <label htmlFor={`search-${title}`} className="sr-only">
              Search tips and actions
            </label>
            <Search
              className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={`search-${title}`}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search steps..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {isLoadingAi && (
        <div
          aria-live="polite"
          aria-label="Preparing personalized family recommendations"
          className="divide-y divide-slate-200"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-5 animate-pulse">
              <div className="h-5 w-2/5 bg-slate-200 rounded" />
              <div className="h-4 w-4/5 bg-slate-100 rounded mt-3" />
              <div className="h-4 w-3/5 bg-slate-100 rounded mt-2" />
            </div>
          ))}
        </div>
      )}

      {!isLoadingAi && filteredActions.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-base font-medium text-slate-900">
            No matching steps found.
          </p>
          <p className="text-sm text-slate-700 mt-1">
            Tap Reset Filters to view all winter air steps for your family.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 min-h-[44px] px-5 py-2.5 text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {!isLoadingAi && filteredActions.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {filteredActions.map((action) => {
            const isSelected = selectedSet.has(action.id);
            const isExpanded = Boolean(expandedIds[action.id]);
            const pm25Pct = Math.round(action.indoorPm25ReductionFraction * 100);
            const monthlyInr = Math.round((action.dailySavingsInr ?? 0) * 30);

            return (
              <li
                key={action.id}
                className={`p-5 sm:p-6 transition-colors ${isSelected ? 'bg-teal-50/45' : 'bg-white hover:bg-slate-50/70'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-0.5 shrink-0">
                    <input
                      id={`action-check-${action.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(action.id)}
                      aria-label={`Adopt action: ${action.title}`}
                      className="h-6 w-6 rounded border-slate-400 text-teal-700 accent-teal-700 cursor-pointer"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <label
                        htmlFor={`action-check-${action.id}`}
                        className="text-base font-semibold text-slate-900 cursor-pointer leading-snug"
                      >
                        {action.title}
                      </label>

                      <div className="text-sm font-mono text-teal-800 font-semibold tabular-nums shrink-0">
                        {pm25Pct > 0 ? `-${pm25Pct}% indoor smoke` : ''}
                        {pm25Pct > 0 && monthlyInr > 0 ? ' · ' : ''}
                        {monthlyInr > 0 ? `Saves ${formatInr(monthlyInr)}/mo` : ''}
                      </div>
                    </div>

                    {/* Clean unboxed metadata */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600 mt-1">
                      <span>{CATEGORY_LABELS[action.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{TIME_LABELS[action.timeSlot]}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {action.costTier === 'Free' ? 'Free (₹0)' : action.costTier}
                      </span>
                      {action.origin === 'gemini-tailored' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-teal-800 font-medium">
                            Tailored for Your Home
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-slate-800 mt-2.5 leading-relaxed">
                      {action.summary}
                    </p>

                    {/* Direct Impact Explanation */}
                    <div className="mt-3 p-3.5 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed">
                      <span className="font-semibold text-slate-900">
                        Why this helps:{' '}
                      </span>
                      {action.directImpactExplanation}
                    </div>

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(action.id)}
                        aria-expanded={isExpanded}
                        className="min-h-[40px] inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 hover:text-teal-950 py-1.5 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" aria-hidden="true" />
                            Hide simple steps
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                            See {action.steps.length} simple steps
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <ol className="mt-2 space-y-2 pl-5 list-decimal text-sm text-slate-800 leading-relaxed">
                          {action.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
