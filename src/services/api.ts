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
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Failed to load air quality data.');
  }
  return (await res.json()) as AirQualitySnapshot;
}

export async function searchCitiesApi(query: string): Promise<CityLocation[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/locations/search?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'City search failed.');
  }
  const data = (await res.json()) as { results: CityLocation[] };
  return data.results ?? [];
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
  const data = (await res.json().catch(() => ({}))) as AiActionPlan & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? 'Could not generate tailored AI action plan.');
  }
  return data;
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
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Unable to reach the AI Smog Advisor.');
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
      const parsed = JSON.parse(dataLine) as { text?: string; error?: string };
      if (eventName === 'error') {
        throw new Error(parsed.error ?? 'Streaming error occurred.');
      }
      if (eventName === 'chunk' && parsed.text) {
        params.onChunk(parsed.text);
      }
    }
  }
}
