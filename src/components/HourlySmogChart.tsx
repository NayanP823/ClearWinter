import { useMemo, useState } from 'react';
import { getAqiCategory } from '../domain/airQuality';
import type { HourlyAirPoint, VentilationWindow } from '../domain/types';

interface HourlySmogChartProps {
  hourly: HourlyAirPoint[];
  ventilation: VentilationWindow;
  cityName: string;
}

export function HourlySmogChart({
  hourly,
  ventilation,
  cityName,
}: HourlySmogChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const chartPoints = useMemo(() => hourly.slice(0, 24), [hourly]);
  const maxPm25 = useMemo(() => {
    const highest = Math.max(65, ...chartPoints.map((p) => p.pm25));
    return Math.ceil(highest / 25) * 25;
  }, [chartPoints]);

  const activePoint =
    selectedIndex !== null && chartPoints[selectedIndex]
      ? chartPoints[selectedIndex]
      : chartPoints[13] ?? chartPoints[0];

  const width = 760;
  const height = 220;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yForValue = (val: number): number =>
    padTop + plotH - (Math.min(val, maxPm25) / maxPm25) * plotH;

  const barGap = 4;
  const barWidth =
    chartPoints.length > 0
      ? Math.max(8, (plotW - barGap * (chartPoints.length - 1)) / chartPoints.length)
      : 16;

  const yTicks = [0, Math.round(maxPm25 / 2), maxPm25];

  return (
    <section
      aria-labelledby="hourly-chart-heading"
      className="bg-white border border-slate-200 rounded-lg p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2
            id="hourly-chart-heading"
            className="text-base font-semibold text-slate-900"
          >
            24-Hour PM2.5 &amp; Ventilation Forecast
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {cityName} hourly particulate curve · Cleanest window{' '}
            <span className="font-mono font-medium text-slate-900 tabular-nums">
              {ventilation.startHour}–{ventilation.endHour}
            </span>{' '}
            ({ventilation.avgPm25} µg/m³ avg)
          </p>
        </div>

        {activePoint && (
          <div
            aria-live="polite"
            className="text-left sm:text-right shrink-0"
          >
            <div className="text-xs text-slate-500">
              Selected hour{' '}
              <span className="font-mono text-slate-800 tabular-nums">
                {activePoint.hourLabel}
              </span>
            </div>
            <div className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
              {activePoint.pm25} µg/m³ PM2.5 · AQI {activePoint.usAqi} ·{' '}
              {activePoint.windKmh} km/h wind
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-xs bg-teal-700 inline-block"
            aria-hidden="true"
          />
          Cleanest ventilation window ({ventilation.startHour}–{ventilation.endHour})
        </span>
        {maxPm25 >= 65 && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-4 border-t-2 border-dashed border-amber-600 inline-block"
              aria-hidden="true"
            />
            Unhealthy PM2.5 threshold (55.5 µg/m³)
          </span>
        )}
      </div>

      <div className="mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`24-hour PM2.5 forecast chart for ${cityName}. Cleanest window is ${ventilation.startHour} to ${ventilation.endHour} averaging ${ventilation.avgPm25} micrograms per cubic meter.`}
          className="w-full min-w-[560px] h-[220px]"
        >
          {/* Horizontal gridlines */}
          {yTicks.map((tick) => {
            const y = yForValue(tick);
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* EPA Unhealthy threshold guide (55.5 ug/m3) if in range */}
          {maxPm25 >= 65 && (
            <line
              x1={padLeft}
              y1={yForValue(55.5)}
              x2={width - padRight}
              y2={yForValue(55.5)}
              stroke="#d97706"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Hourly bars */}
          {chartPoints.map((pt, idx) => {
            const x = padLeft + idx * (barWidth + barGap);
            const y = yForValue(pt.pm25);
            const barH = Math.max(2, padTop + plotH - y);
            const isVentWindow =
              pt.hourLabel === ventilation.startHour ||
              pt.hourLabel === ventilation.endHour;
            const isSelected = selectedIndex === idx;
            const category = getAqiCategory(pt.usAqi);

            return (
              <g key={`${pt.hourLabel}-${idx}`}>
                {isVentWindow && (
                  <rect
                    x={x - 2}
                    y={padTop}
                    width={barWidth + 4}
                    height={plotH}
                    fill="#f0fdfa"
                  />
                )}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="2"
                  fill={isVentWindow ? '#0f766e' : category.accentHex}
                  fillOpacity={isSelected ? 1 : isVentWindow ? 0.92 : 0.78}
                  stroke={isSelected ? '#0f172a' : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <title>
                    {pt.hourLabel}: {pt.pm25} µg/m³ PM2.5 (AQI {pt.usAqi}, Wind{' '}
                    {pt.windKmh} km/h)
                  </title>
                </rect>

                {idx % 3 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {pt.hourLabel.slice(0, 2)}h
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Concise ventilation advisory bar */}
      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          <strong className="font-semibold text-slate-900">
            Ventilation guidance:
          </strong>{' '}
          {ventilation.advisory}
        </span>
        <span className="font-mono text-teal-800 font-medium shrink-0 tabular-nums">
          {ventilation.isSafeToOpen
            ? `Open up to ${ventilation.recommendedMinutes} min`
            : 'Keep windows sealed'}
        </span>
      </div>
    </section>
  );
}
