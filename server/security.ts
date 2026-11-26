import { z } from 'zod';

export const ALLOWED_UPSTREAM_HOSTS = new Set<string>([
  'air-quality-api.open-meteo.com',
  'api.open-meteo.com',
  'geocoding-api.open-meteo.com',
]);

/**
 * Verifies that an outbound fetch URL targets only an HTTPS allowlisted public API host,
 * blocking SSRF attempts against private, loopback, or arbitrary hosts.
 */
export function assertAllowedUpstreamUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') {
    throw new Error('Blocked non-HTTPS upstream request');
  }
  if (!ALLOWED_UPSTREAM_HOSTS.has(parsed.hostname)) {
    throw new Error(`Blocked non-allowlisted upstream host: ${parsed.hostname}`);
  }
  return parsed;
}

/**
 * Strips ASCII control characters and collapses excessive whitespace to keep prompts and logs clean.
 */
export function sanitizeText(value: string, maxLength = 300): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export const airQualityQuerySchema = z.object({
  id: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(1).max(100).default('New Delhi'),
  country: z.string().trim().min(1).max(100).default('India'),
  region: z.string().trim().max(120).default('Urban Basin'),
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
});

export const locationSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters to search a city')
    .max(80, 'Search query is too long'),
});

export const householdProfileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  homeType: z.enum(['apartment', 'detached_house', 'shared_building']),
  commuteMode: z.enum([
    'petrol_car',
    'diesel_suv',
    'two_wheeler',
    'public_transit',
    'walk_cycle',
    'remote_work',
  ]),
  dailyCommuteKm: z.number().min(0).max(300),
  heatingFuel: z.enum([
    'wood_coal',
    'gas_furnace',
    'electric_heat_pump',
    'kerosene_lpg',
    'minimal_heating',
  ]),
  cookingFuel: z.enum(['gas_stove', 'induction_electric', 'solid_biomass']),
  purifierAccess: z.enum(['none', 'hepa_unit', 'diy_corsi_rosenthal']),
  sensitiveGroups: z
    .array(z.enum(['children', 'seniors', 'asthma', 'pregnancy']))
    .max(4),
  communityHouseholds: z.number().int().min(1).max(5000),
});

export const airQualityContextSchema = z.object({
  cityName: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  region: z.string().trim().max(120).optional().default(''),
  usAqi: z.number().min(0).max(600),
  pm25: z.number().min(0).max(1500),
  pm10: z.number().min(0).max(2000),
  no2: z.number().min(0).max(1000),
  tempC: z.number().min(-60).max(60),
  windKmh: z.number().min(0).max(250),
  humidityPct: z.number().min(0).max(100),
  inversionLevel: z.enum(['Low', 'Elevated', 'High', 'Severe']),
  bestVentilationWindow: z.string().trim().max(80),
});

export const planRequestSchema = z.object({
  profile: householdProfileSchema,
  airQuality: airQualityContextSchema,
});

export const chatRequestSchema = z.object({
  profile: householdProfileSchema,
  airQuality: airQualityContextSchema,
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(1200),
      }),
    )
    .min(1)
    .max(16),
});

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Lightweight in-memory sliding-window rate limiter to protect API endpoints from bursts.
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: { windowMs: number; maxRequests: number }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  check(key: string, nowMs = Date.now()): RateLimitResult {
    const cutoff = nowMs - this.windowMs;
    const existing = this.hits.get(key) ?? [];
    const recent = existing.filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      this.hits.set(key, recent);
      const oldest = recent[0] ?? nowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + this.windowMs - nowMs) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    recent.push(nowMs);
    this.hits.set(key, recent);

    // Prevent unbounded map growth in long-running processes
    if (this.hits.size > 2000) {
      for (const [entryKey, timestamps] of this.hits.entries()) {
        if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
          this.hits.delete(entryKey);
        }
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - recent.length),
      retryAfterSeconds: 0,
    };
  }
}

/**
 * Simple bounded TTL cache for upstream air quality and geocoding responses.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options: { ttlMs: number; maxEntries?: number }) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries ?? 250;
  }

  get(key: string, nowMs = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= nowMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, nowMs = Date.now()): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: nowMs + this.ttlMs });
  }
}
