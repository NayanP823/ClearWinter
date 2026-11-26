import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { AiActionPlan, SmogAction } from '../src/domain/types';
import type { z } from 'zod';
import {
  sanitizeText,
  type chatRequestSchema,
  type planRequestSchema,
} from './security';

const GEMINI_MODEL = 'gemini-4-hydrogen';

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable personalized AI recommendations.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < 2) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT');
      if (!isTransient || attempt === 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
      attempt += 1;
    }
  }
  throw lastError;
}

type PlanRequestPayload = z.infer<typeof planRequestSchema>;
type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

function buildHouseholdContextBlock(
  profile: PlanRequestPayload['profile'],
  airQuality: PlanRequestPayload['airQuality'],
): string {
  const sensitive =
    profile.sensitiveGroups.length > 0
      ? profile.sensitiveGroups.join(', ')
      : 'none reported';
  return [
    `Location: ${sanitizeText(airQuality.cityName, 80)}, ${sanitizeText(airQuality.country, 80)} (${sanitizeText(airQuality.region, 80)})`,
    `Current Air Quality: US AQI ${Math.round(airQuality.usAqi)}, PM2.5 ${airQuality.pm25} ug/m3, PM10 ${airQuality.pm10} ug/m3, NO2 ${airQuality.no2} ug/m3`,
    `Winter Weather & Inversion: ${airQuality.tempC} C, Wind ${airQuality.windKmh} km/h, Humidity ${airQuality.humidityPct}%, Thermal Inversion Risk: ${airQuality.inversionLevel}`,
    `Cleanest 2-hour Ventilation Window: ${sanitizeText(airQuality.bestVentilationWindow, 60)}`,
    `Household: ${profile.householdSize} people in a ${profile.homeType.replace('_', ' ')}`,
    `Sensitive Members: ${sensitive}`,
    `Commute: ${profile.commuteMode.replace('_', ' ')} (${profile.dailyCommuteKm} km/day)`,
    `Heating: ${profile.heatingFuel.replace('_', ' ')}, Cooking: ${profile.cookingFuel.replace('_', ' ')}`,
    `Current Air Filtration: ${profile.purifierAccess.replace('_', ' ')}`,
    `Community Reach Goal: ${profile.communityHouseholds} neighborhood households`,
  ].join('\n');
}

interface RawGeminiPlan {
  headline: string;
  locationContextSummary: string;
  ventilationGuidance: string;
  communityBrief: string;
  actions: Array<{
    title: string;
    category: 'routine' | 'indoor_hack' | 'sustainable_alt';
    timeSlot: 'morning' | 'midday' | 'evening' | 'anytime';
    costTier: 'Free' | 'Low Cost' | 'Investment';
    difficulty: 'Easy' | 'Moderate' | 'Community';
    summary: string;
    steps: string[];
    indoorPm25ReductionFraction: number;
    dailyCo2eSavedGrams: number;
    dailyLocalPm25SavedMg: number;
    dailySavingsInr: number;
    directImpactExplanation: string;
  }>;
}

/**
 * Calls Gemini 4 Hydrogen with structured JSON schema to generate a tailored winter smog plan.
 */
export async function generateTailoredSmogPlan(
  payload: PlanRequestPayload,
): Promise<AiActionPlan> {
  const ai = getGeminiClient();
  const contextBlock = buildHouseholdContextBlock(
    payload.profile,
    payload.airQuality,
  );

  const response = await withTransientRetry(() =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        'Generate a practical, evidence-based winter smog action plan tailored strictly to this Indian family and city.',
        'Include exactly 6 actions: 2 low-emission daily routines ("routine"), 2 indoor air quality hacks ("indoor_hack"), and 2 sustainable alternatives ("sustainable_alt").',
        'Use Indian household context (flats/independent houses, RWA societies, LPG/PNG gas or induction, Metro/CNG auto/two-wheeler, wet pocha instead of dry sweeping, pausing agarbatti/dhoop/mosquito coils, avoiding wood/leaf angithi fires) and ALWAYS state all costs or savings strictly in Indian Rupees (₹), NEVER in US dollars ($).',
        'Write in warm, clear, simple everyday language that senior citizens and grandparents can read effortlessly.',
        'Ensure every action clearly explains the direct respiratory, indoor PM2.5, or neighborhood air quality impact of the family’s choice using realistic, non-exaggerated numbers.',
        'Keep each title under 75 characters, summary under 180 characters, and 3 concrete steps per action.',
        '',
        'CONTEXT:',
        contextBlock,
      ].join('\n'),
      config: {
        systemInstruction:
          'You are ClearAir Winter, a calm, practical environmental health advisor helping Indian families, senior citizens, and RWA communities navigate severe winter smog and urban air pollution. Give practical, low-cost, scientifically grounded recommendations tailored to Indian homes and local weather inversions. Always quote prices and savings in Indian Rupees (₹), never dollars ($). Use plain, easy-to-read language without technical jargon. Never give medical diagnoses; recommend consulting a doctor for acute symptoms.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description: 'Concise action plan headline tailored to the city and smog severity.',
            },
            locationContextSummary: {
              type: Type.STRING,
              description: '2-sentence plain-language explanation of today’s local winter smog and inversion drivers.',
            },
            ventilationGuidance: {
              type: Type.STRING,
              description: 'Specific 1-2 sentence window ventilation instruction referencing the cleanest hours.',
            },
            communityBrief: {
              type: Type.STRING,
              description: 'A ready-to-share 3-sentence message for a neighborhood or school parent group to coordinate low-emission winter actions.',
            },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['routine', 'indoor_hack', 'sustainable_alt'],
                  },
                  timeSlot: {
                    type: Type.STRING,
                    enum: ['morning', 'midday', 'evening', 'anytime'],
                  },
                  costTier: {
                    type: Type.STRING,
                    enum: ['Free', 'Low Cost', 'Investment'],
                  },
                  difficulty: {
                    type: Type.STRING,
                    enum: ['Easy', 'Moderate', 'Community'],
                  },
                  summary: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  indoorPm25ReductionFraction: {
                    type: Type.NUMBER,
                    description: 'Realistic fraction between 0.02 and 0.55 representing indoor PM2.5 reduction.',
                  },
                  dailyCo2eSavedGrams: {
                    type: Type.NUMBER,
                    description: 'Estimated daily grams of CO2e avoided per household (0 to 5000).',
                  },
                  dailyLocalPm25SavedMg: {
                    type: Type.NUMBER,
                    description: 'Estimated daily milligrams of local PM2.5 prevented (0 to 400).',
                  },
                  dailySavingsInr: {
                    type: Type.NUMBER,
                    description: 'Estimated daily household fuel or electricity savings in Indian Rupees (INR, 0 to 300).',
                  },
                  directImpactExplanation: {
                    type: Type.STRING,
                    description: 'Clear 1-2 sentence explanation in simple language of how this specific choice directly reduces inhaled smoke or neighborhood smog.',
                  },
                },
                required: [
                  'title',
                  'category',
                  'timeSlot',
                  'costTier',
                  'difficulty',
                  'summary',
                  'steps',
                  'indoorPm25ReductionFraction',
                  'dailyCo2eSavedGrams',
                  'dailyLocalPm25SavedMg',
                  'dailySavingsInr',
                  'directImpactExplanation',
                ],
              },
            },
          },
          required: [
            'headline',
            'locationContextSummary',
            'ventilationGuidance',
            'communityBrief',
            'actions',
          ],
        },
      },
    }),
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Empty response received from Gemini model');
  }

  const parsed = JSON.parse(rawText) as RawGeminiPlan;
  const actions: SmogAction[] = (parsed.actions ?? []).slice(0, 8).map((item, idx) => ({
    id: `ai-action-${Date.now()}-${idx}`,
    title: sanitizeText(item.title, 110),
    category: item.category,
    timeSlot: item.timeSlot,
    costTier: item.costTier,
    difficulty: item.difficulty,
    summary: sanitizeText(item.summary, 240),
    steps: (item.steps ?? []).slice(0, 4).map((s) => sanitizeText(s, 180)),
    indoorPm25ReductionFraction: Math.min(
      0.55,
      Math.max(0, Number(item.indoorPm25ReductionFraction) || 0),
    ),
    dailyCo2eSavedGrams: Math.min(
      6000,
      Math.max(0, Math.round(Number(item.dailyCo2eSavedGrams) || 0)),
    ),
    dailyLocalPm25SavedMg: Math.min(
      500,
      Math.max(0, Math.round(Number(item.dailyLocalPm25SavedMg) || 0)),
    ),
    dailySavingsInr: Math.min(
      500,
      Math.max(0, Math.round(Number(item.dailySavingsInr) || 0)),
    ),
    directImpactExplanation: sanitizeText(item.directImpactExplanation, 280),
    origin: 'gemini-tailored',
  }));

  return {
    generatedAt: new Date().toISOString(),
    headline: sanitizeText(parsed.headline, 140),
    locationContextSummary: sanitizeText(parsed.locationContextSummary, 420),
    ventilationGuidance: sanitizeText(parsed.ventilationGuidance, 320),
    communityBrief: sanitizeText(parsed.communityBrief, 600),
    actions,
  };
}

/**
 * Streams a contextual winter smog advisory response from Gemini 4 Hydrogen.
 */
export async function streamSmogAdvisorReply(
  payload: ChatRequestPayload,
  onChunk: (text: string) => void,
): Promise<void> {
  const ai = getGeminiClient();
  const contextBlock = buildHouseholdContextBlock(
    payload.profile,
    payload.airQuality,
  );

  const transcript = payload.messages
    .map((m) => `${m.role === 'user' ? 'Family Member' : 'Advisor'}: ${sanitizeText(m.content, 1000)}`)
    .join('\n');

  const stream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: [
      'HOUSEHOLD & LIVE AIR QUALITY CONTEXT:',
      contextBlock,
      '',
      'CONVERSATION:',
      transcript,
      '',
      'Respond directly to the latest Family Member message.',
    ].join('\n'),
    config: {
      systemInstruction:
        'You are ClearAir Winter, a warm, practical air quality and winter smog advisor for Indian families, senior citizens, and RWA apartment communities. Always tailor answers to the user’s exact Indian city, PM2.5/AQI, commute, LPG/PNG/induction kitchen, and older/younger family members. Always state all costs and savings strictly in Indian Rupees (₹), never in dollars ($). Clearly explain the direct health and money-saving impact of each recommended choice in short, easy-to-read sentences or numbered steps under 200 words. Avoid technical jargon and never fabricate measurements.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  for await (const chunk of stream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}
