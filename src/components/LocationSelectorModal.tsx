import { MapPin, Search, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { PRESET_CITIES } from '../domain/airQuality';
import type { CityLocation } from '../domain/types';
import { searchCitiesApi } from '../services/api';

interface LocationSelectorModalProps {
  isOpen: boolean;
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  onClose: () => void;
}

export function LocationSelectorModal({
  isOpen,
  currentCity,
  onSelectCity,
  onClose,
}: LocationSelectorModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setErrorMsg('Please enter at least 2 characters to search.');
      return;
    }
    setErrorMsg(null);
    setIsSearching(true);
    setHasSearched(true);
    try {
      const found = await searchCitiesApi(trimmed);
      setResults(found);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to search locations.',
      );
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2
            id="location-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            Choose Your City
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close city selector"
            className="p-2.5 text-slate-600 hover:text-slate-900 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <label htmlFor="city-search-input" className="sr-only">
                Search any Indian city
              </label>
              <Search
                className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="city-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city (e.g. Jaipur, Pune, Chandigarh)..."
                className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="h-11 px-4 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {errorMsg && (
            <p role="alert" className="mt-2.5 text-sm text-red-700">
              {errorMsg}
            </p>
          )}

          {hasSearched && !isSearching && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Search Results
              </h3>
              {results.length === 0 ? (
                <p className="text-sm text-slate-700 py-3">
                  No matching cities found. Try another spelling or pick a city below.
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md max-h-48 overflow-y-auto">
                  {results.map((city) => (
                    <li key={city.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCity(city);
                          onClose();
                        }}
                        className="w-full min-h-[48px] px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {city.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            {city.region} · {city.country}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Major Indian Cities
            </h3>
            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
              {PRESET_CITIES.map((city) => {
                const isSelected = city.id === currentCity.id;
                return (
                  <li key={city.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCity(city);
                        onClose();
                      }}
                      className={`w-full min-h-[52px] px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                          <MapPin
                            className="w-4 h-4 text-teal-700 shrink-0"
                            aria-hidden="true"
                          />
                          <span>{city.name}</span>
                          <span className="text-xs font-normal text-slate-600">
                            · {city.region}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                          {city.winterNote}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-semibold text-teal-800 shrink-0">
                          Selected
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
