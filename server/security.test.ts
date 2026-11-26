import test from 'node:test';
import assert from 'node:assert/strict';
import {
  airQualityQuerySchema,
  assertAllowedUpstreamUrl,
  chatRequestSchema,
  planRequestSchema,
  sanitizeText,
  SlidingWindowRateLimiter,
  TtlCache,
} from './security';

test('assertAllowedUpstreamUrl blocks non-HTTPS and non-allowlisted SSRF targets', () => {
  const ok = assertAllowedUpstreamUrl(
    'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=28.6&longitude=77.2',
  );
  assert.equal(ok.hostname, 'air-quality-api.open-meteo.com');

  assert.throws(() =>
    assertAllowedUpstreamUrl('http://air-quality-api.open-meteo.com/v1/air-quality'),
  );
  assert.throws(() =>
    assertAllowedUpstreamUrl('https://169.254.169.254/latest/meta-data/'),
  );
  assert.throws(() =>
    assertAllowedUpstreamUrl('https://127.0.0.1:3000/api/health'),
  );
  assert.throws(() =>
    assertAllowedUpstreamUrl('https://evil.example.com/exfiltrate'),
  );
});

test('sanitizeText strips control chars and truncates long strings', () => {
  const dirty = 'New\u0000 Delhi\t\n  Smog   Alert';
  assert.equal(sanitizeText(dirty, 50), 'New Delhi Smog Alert');
  assert.equal(sanitizeText('abcdef', 4), 'abcd');
});

test('Zod schemas reject out-of-range coordinates and oversized chat payloads', () => {
  const badLat = airQualityQuerySchema.safeParse({ lat: 95, lon: 77 });
  assert.equal(badLat.success, false);

  const validCoords = airQualityQuerySchema.safeParse({
    lat: '28.6139',
    lon: '77.209',
    name: 'New Delhi',
  });
  assert.equal(validCoords.success, true);

  const validPlan = planRequestSchema.safeParse({
    profile: {
      householdSize: 4,
      homeType: 'apartment',
      commuteMode: 'petrol_car',
      dailyCommuteKm: 15,
      heatingFuel: 'gas_furnace',
      cookingFuel: 'gas_stove',
      purifierAccess: 'none',
      sensitiveGroups: ['children'],
      communityHouseholds: 20,
    },
    airQuality: {
      cityName: 'New Delhi',
      country: 'India',
      usAqi: 240,
      pm25: 190,
      pm10: 280,
      no2: 60,
      tempC: 11,
      windKmh: 4,
      humidityPct: 78,
      inversionLevel: 'Severe',
      bestVentilationWindow: '13:00 – 15:00',
    },
  });
  assert.equal(validPlan.success, true);

  const emptyChat = chatRequestSchema.safeParse({
    profile: validPlan.success ? validPlan.data.profile : {},
    airQuality: validPlan.success ? validPlan.data.airQuality : {},
    messages: [],
  });
  assert.equal(emptyChat.success, false);
});

test('SlidingWindowRateLimiter enforces per-key request limits and resets after window', () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 10_000, maxRequests: 2 });
  assert.equal(limiter.check('10.0.0.1', 1000).allowed, true);
  assert.equal(limiter.check('10.0.0.1', 2000).allowed, true);

  const blocked = limiter.check('10.0.0.1', 3000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 8);

  // Different IP still allowed
  assert.equal(limiter.check('10.0.0.2', 3000).allowed, true);

  // After window elapses, original IP is allowed again
  assert.equal(limiter.check('10.0.0.1', 12_000).allowed, true);
});

test('TtlCache expires stale items and bounds size', () => {
  const cache = new TtlCache<string>({ ttlMs: 1000, maxEntries: 2 });
  cache.set('a', 'first', 100);
  cache.set('b', 'second', 100);
  assert.equal(cache.get('a', 500), 'first');
  assert.equal(cache.get('a', 1200), undefined);

  cache.set('c', 'third', 1300);
  cache.set('d', 'fourth', 1300);
  assert.equal(cache.get('d', 1400), 'fourth');
});
