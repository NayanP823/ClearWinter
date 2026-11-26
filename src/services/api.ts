import { normalizeAiActionPlan } from '../domain/impactCalculator';
import type {
  AiActionPlan,
  AirQualitySnapshot,
  CityLocation,
  HouseholdProfile,
  InversionRiskAssessment,
  VentilationWindow,
} from '../domain/types';

export interface AirQualityContextPayload {
  cityName: string;
  country: string;
  region: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  tempC: number;
  windKmh: number;
  humidityPct: number;
  inversionLevel: InversionRiskAssessment['level'];
  bestVentilationWindow: string;
}

export function buildAirQualityContext(
  snapshot: AirQualitySnapshot,
  inversion: InversionRiskAssessment,
  ventilation: VentilationWindow,
): AirQualityContextPayload {
  return {
    cityName: snapshot.city.name,
    country: snapshot.city.country,
    region: snapshot.city.region,
    usAqi: snapshot.usAqi,
    pm25: snapshot.pm25,
    pm10: snapshot.pm10,
    no2: snapshot.no2,
    tempC: snapshot.tempC,
    windKmh: snapshot.windKmh,
    humidityPct: snapshot.humidityPct,
    inversionLevel: inversion.level,
    bestVentilationWindow: `${ventilation.startHour} – ${ventilation.endHour}`,
  };
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function extractApiError(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === 'object' &&
    'error' in body &&
    typeof (body as { error?: unknown }).error === 'string' &&
    (body as { error: string }).error.trim().length > 0
  ) {
    return (body as { error: string }).error.trim();
  }
  return fallback;
}

export async function fetchCityAirQuality(
  city: CityLocation,
): Promise<AirQualitySnapshot> {
  const params = new URLSearchParams({
    id: city.id,
    name: city.name,
    country: city.country,
    region: city.region,
    lat: String(city.latitude),
    lon: String(city.longitude),
  });
  const res = await fetch(`/api/air-quality?${params.toString()}`);
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractApiError(body, 'Failed to load air quality data.'));
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray((body as Partial<AirQualitySnapshot>).hourly) ||
    typeof (body as Partial<AirQualitySnapshot>).usAqi !== 'number'
  ) {
    throw new Error('Received incomplete air quality data. Using seasonal baseline.');
  }
  return body as AirQualitySnapshot;
}

export async function searchCitiesApi(query: string): Promise<CityLocation[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/locations/search?${params.toString()}`);
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(extractApiError(body, 'City search failed.'));
  }
  if (
    body &&
    typeof body === 'object' &&
    Array.isArray((body as { results?: unknown }).results)
  ) {
    return (body as { results: CityLocation[] }).results;
  }
  return [];
}

export async function generateAiSmogPlan(params: {
  profile: HouseholdProfile;
  airQuality: AirQualityContextPayload;
}): Promise<AiActionPlan> {
  const res = await fetch('/api/assistant/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      extractApiError(body, 'Could not generate tailored AI action plan.'),
    );
  }
  const normalized = normalizeAiActionPlan(body);
  if (!normalized) {
    throw new Error(
      extractApiError(
        body,
        'The AI advisor returned an incomplete plan. Please try again in a moment.',
      ),
    );
  }
  return normalized;
}

export async function streamAdvisorChat(params: {
  profile: HouseholdProfile;
  airQuality: AirQualityContextPayload;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const res = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: params.profile,
      airQuality: params.airQuality,
      messages: params.messages,
    }),
    signal: params.signal,
  });

  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new Error(
      extractApiError(body, 'Unable to reach the AI Smog Advisor.'),
    );
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    const body = await parseJsonSafe(res);
    throw new Error(
      extractApiError(
        body,
        'The AI advisor is temporarily unavailable. Please try again shortly.',
      ),
    );
  }

  if (!res.body) {
    throw new Error('Streaming response unavailable in this browser.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      let eventName = 'message';
      let dataLine = '';
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLine += line.slice(5).trim();
        }
      }
      if (!dataLine) continue;
      let parsed: { text?: string; error?: string };
      try {
        parsed = JSON.parse(dataLine) as { text?: string; error?: string };
      } catch {
        continue;
      }
      if (eventName === 'error') {
        throw new Error(parsed.error ?? 'Streaming error occurred.');
      }
      if (eventName === 'chunk' && typeof parsed.text === 'string' && parsed.text) {
        params.onChunk(parsed.text);
      }
    }
  }
}
