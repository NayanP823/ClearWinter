import type { SmogAction } from '../domain/types';
import { ActionCardList } from './ActionCardList';

interface IndoorHacksGuideProps {
  actions: SmogAction[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  isLoadingAi: boolean;
}

const INDIAN_DIY_FILTER_SPECS = [
  {
    room: 'Small Bedroom (10 × 12 ft)',
    setup: '300mm Indian Exhaust/Table Fan + 1× True HEPA Replacement Filter',
    cadr: '220 m³/hr',
    cost: '₹2,400 – ₹3,200',
    clearance: '~14 min for 50% smoke drop',
  },
  {
    room: 'Master Bedroom / Living Room (15 × 18 ft)',
    setup: '400mm High-Speed Box Fan + 2× MERV-13 / HEPA Pleated Filters',
    cadr: '480 m³/hr',
    cost: '₹3,500 – ₹4,800',
    clearance: '~10 min for 50% smoke drop',
  },
  {
    room: 'Large Hall / Society Club Room (25 × 25 ft)',
    setup: '2× Standard Fan-Filter Boxes placed on opposite corners',
    cadr: '960 m³/hr',
    cost: '₹7,000 – ₹9,200',
    clearance: '~12 min for 50% smoke drop',
  },
];

export function IndoorHacksGuide({
  actions,
  selectedIds,
  onToggleSelect,
  isLoadingAi,
}: IndoorHacksGuideProps) {
  return (
    <div className="space-y-6">
      <ActionCardList
        title="Easy Indoor Air Tips for Indian Homes"
        subtitle="Simple, low-cost ways to keep bedrooms and living rooms cleaner during heavy winter smog."
        actions={actions}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        filterMode="cost"
        isLoadingAi={isLoadingAi}
      />

      <section
        aria-labelledby="cr-box-reference-heading"
        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
      >
        <div className="p-5 sm:p-6 border-b border-slate-200">
          <h2
            id="cr-box-reference-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Budget DIY Air Cleaner Guide (in ₹)
          </h2>
          <p className="text-sm text-slate-700 mt-1">
            Compare Indian market costs and room cleaning speed versus ₹12,000–₹20,000 branded purifiers.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700">
                <th scope="col" className="py-3.5 px-5">
                  Room Size
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Simple Local Setup
                </th>
                <th scope="col" className="py-3.5 px-4 text-right">
                  Airflow
                </th>
                <th scope="col" className="py-3.5 px-4 text-right">
                  Approx. Cost (₹)
                </th>
                <th scope="col" className="py-3.5 px-5 text-right">
                  Cleaning Speed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {INDIAN_DIY_FILTER_SPECS.map((row) => (
                <tr key={row.room} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    {row.room}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{row.setup}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-teal-800 whitespace-nowrap">
                    {row.cadr}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {row.cost}
                  </td>
                  <td className="py-3.5 px-5 text-right text-slate-700 whitespace-nowrap">
                    {row.clearance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
