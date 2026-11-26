import {
  buildSeasonalBaselineSnapshot,
  calculatePm25Aqi,
  PRESET_CITIES,
} from '../src/domain/airQuality';
import type {
  AirQualitySnapshot,
  CityLocation,
  HourlyAirPoint,
} from '../src/domain/types';
import { assertAllowedUpstreamUrl, sanitizeText, TtlCache } from './security';

const airQualityCache = new TtlCache<AirQualitySnapshot>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 120,
});

const geocodeCache = new TtlCache<CityLocation[]>({
  ttlMs: 15 * 60 * 1000,
  maxEntries: 150,
});

interface OpenMeteoAirResponse {
  current?: {
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
    time?: string;
  };
  hourly?: {
    time?: string[];
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
    us_aqi?: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: Array<number | null>;
    wind_speed_10m?: Array<number | null>;
  };
}

interface OpenMeteoGeoResponse {
  results?: Array<{
    id: number;
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
}

/**
 * Fetches live air quality + weather telemetry from Open-Meteo (no API key required)
 * with strict SSRF host validation, caching, and graceful fallback to seasonal baseline.
 */
export async function fetchAirQualitySnapshot(
  city: CityLocation,
): Promise<AirQualitySnapshot> {
  const cacheKey = `${city.latitude.toFixed(2)},${city.longitude.toFixed(2)}`;
  const cached = airQualityCache.get(cacheKey);
  if (cached) {
    return { ...cached, city };
  }

  const aqUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  aqUrl.searchParams.set('latitude', city.latitude.toFixed(4));
  aqUrl.searchParams.set('longitude', city.longitude.toFixed(4));
  aqUrl.searchParams.set(
    'current',
    'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone',
  );
  aqUrl.searchParams.set('hourly', 'pm2_5,pm10,us_aqi');
  aqUrl.searchParams.set('forecast_days', '1');
  aqUrl.searchParams.set('timezone', 'auto');

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', city.latitude.toFixed(4));
  weatherUrl.searchParams.set('longitude', city.longitude.toFixed(4));
  weatherUrl.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,wind_speed_10m',
  );
  weatherUrl.searchParams.set('hourly', 'temperature_2m,wind_speed_10m');
  weatherUrl.searchParams.set('forecast_days', '1');
  weatherUrl.searchParams.set('timezone', 'auto');

  try {
    const safeAqUrl = assertAllowedUpstreamUrl(aqUrl.toString());
    const safeWeatherUrl = assertAllowedUpstreamUrl(weatherUrl.toString());

    const [aqRes, weatherRes] = await Promise.all([
      fetch(safeAqUrl, { signal: AbortSignal.timeout(5500) }),
      fetch(safeWeatherUrl, { signal: AbortSignal.timeout(5500) }),
    ]);

    if (!aqRes.ok || !weatherRes.ok) {
      throw new Error(`Open-Meteo returned ${aqRes.status}/${weatherRes.status}`);
    }

    const aqJson = (await aqRes.json()) as OpenMeteoAirResponse;
    const weatherJson = (await weatherRes.json()) as OpenMeteoWeatherResponse;

    const pm25 = Math.round((aqJson.current?.pm2_5 ?? 25) * 10) / 10;
    const pm10 = Math.round((aqJson.current?.pm10 ?? pm25 * 1.4) * 10) / 10;
    const usAqi = Math.round(
      aqJson.current?.us_aqi ?? calculatePm25Aqi(pm25),
    );
    const no2 = Math.round((aqJson.current?.nitrogen_dioxide ?? 18) * 10) / 10;
    const o3 = Math.round((aqJson.current?.ozone ?? 35) * 10) / 10;
    const tempC = Math.round((weatherJson.current?.temperature_2m ?? 8) * 10) / 10;
    const windKmh = Math.round((weatherJson.current?.wind_speed_10m ?? 7) * 10) / 10;
    const humidityPct = Math.round(weatherJson.current?.relative_humidity_2m ?? 65);

    const times = aqJson.hourly?.time ?? [];
    const hourly: HourlyAirPoint[] = times.slice(0, 24).map((isoTime, idx) => {
      const hPm25 = Math.round((aqJson.hourly?.pm2_5?.[idx] ?? pm25) * 10) / 10;
      const hPm10 = Math.round((aqJson.hourly?.pm10?.[idx] ?? pm10) * 10) / 10;
      const hAqi = Math.round(
        aqJson.hourly?.us_aqi?.[idx] ?? calculatePm25Aqi(hPm25),
      );
      const hWind =
        Math.round((weatherJson.hourly?.wind_speed_10m?.[idx] ?? windKmh) * 10) /
        10;
      const hTemp =
        Math.round((weatherJson.hourly?.temperature_2m?.[idx] ?? tempC) * 10) /
        10;
      const timePart = isoTime.includes('T') ? isoTime.split('T')[1].slice(0, 5) : `${String(idx).padStart(2, '0')}:00`;
      return {
        hourLabel: timePart,
        isoTime,
        pm25: hPm25,
        pm10: hPm10,
        usAqi: hAqi,
        windKmh: hWind,
        tempC: hTemp,
      };
    });

    const snapshot: AirQualitySnapshot = {
      city,
      source: 'open-meteo-live',
      updatedAt: new Date().toISOString(),
      usAqi,
      pm25,
      pm10,
      no2,
      o3,
      tempC,
      windKmh,
      humidityPct,
      hourly: hourly.length >= 6 ? hourly : buildSeasonalBaselineSnapshot(city).hourly,
    };

    airQualityCache.set(cacheKey, snapshot);
    return snapshot;
  } catch {
    // Graceful, explicitly labeled seasonal baseline fallback when upstream network is unavailable
    return buildSeasonalBaselineSnapshot(city);
  }
}

/**
 * Searches global cities via Open-Meteo Geocoding API with fallback matching against preset cities.
 */
export async function searchLocations(rawQuery: string): Promise<CityLocation[]> {
  const query = sanitizeText(rawQuery, 80);
  const cacheKey = query.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geoUrl.searchParams.set('name', query);
  geoUrl.searchParams.set('count', '6');
  geoUrl.searchParams.set('language', 'en');
  geoUrl.searchParams.set('format', 'json');

  try {
    const safeUrl = assertAllowedUpstreamUrl(geoUrl.toString());
    const response = await fetch(safeUrl, { signal: AbortSignal.timeout(4500) });
    if (!response.ok) {
      throw new Error(`Geocoding failed with ${response.status}`);
    }
    const data = (await response.json()) as OpenMeteoGeoResponse;
    const locations: CityLocation[] = (data.results ?? []).map((item) => ({
      id: `geo-${item.id}`,
      name: sanitizeText(item.name, 80),
      country: sanitizeText(item.country ?? 'Unknown', 80),
      region: sanitizeText(item.admin1 ?? item.country ?? 'Urban Area', 80),
      latitude: item.latitude,
      longitude: item.longitude,
      winterNote:
        'Live regional telemetry with winter inversion and ventilation window modeling.',
    }));
    geocodeCache.set(cacheKey, locations);
    return locations;
  } catch {
    const q = cacheKey;
    return PRESET_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(q) ||
        city.country.toLowerCase().includes(q) ||
        city.region.toLowerCase().includes(q),
    );
  }
}
