import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { PRESET_CITIES } from './src/domain/airQuality';
import type { CityLocation } from './src/domain/types';
import {
  fetchAirQualitySnapshot,
  searchLocations,
} from './server/airQualityService';
import {
  GeminiConfigError,
  generateTailoredSmogPlan,
  streamSmogAdvisorReply,
} from './server/geminiService';
import {
  airQualityQuerySchema,
  chatRequestSchema,
  locationSearchQuerySchema,
  planRequestSchema,
  SlidingWindowRateLimiter,
} from './server/security';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const telemetryLimiter = new SlidingWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
});

const aiLimiter = new SlidingWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 18,
});

function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'local';
}

function createRateLimitMiddleware(limiter: SlidingWindowRateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = limiter.check(getClientKey(req));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      res.status(429).json({
        error: 'Too many requests. Please wait a few seconds and try again.',
      });
      return;
    }
    next();
  };
}

function mapGeminiError(error: unknown): { status: number; message: string } {
  if (error instanceof GeminiConfigError) {
    return { status: 503, message: error.message };
  }
  const raw = error instanceof Error ? error.message : String(error);
  console.error('[Gemini API error]:', raw.slice(0, 300));
  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Gemini API access was denied. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota is currently exhausted. Please wait briefly or check your key tier in Settings > Secrets.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 502,
      message:
        'The requested Gemini model is temporarily unavailable. Please try again shortly.',
    };
  }
  return {
    status: 502,
    message:
      'Unable to reach the AI advisor right now. Your live air quality data and interactive impact calculator remain fully available.',
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');

  // Security headers compatible with iframe preview
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    '/api/locations/search',
    createRateLimitMiddleware(telemetryLimiter),
    async (req, res) => {
      const parsed = locationSearchQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message ?? 'Invalid search query',
        });
        return;
      }
      const results = await searchLocations(parsed.data.q);
      res.json({ results });
    },
  );

  app.get(
    '/api/air-quality',
    createRateLimitMiddleware(telemetryLimiter),
    async (req, res) => {
      const parsed = airQualityQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid location coordinates or parameters.',
        });
        return;
      }

      const presetMatch = parsed.data.id
        ? PRESET_CITIES.find((c) => c.id === parsed.data.id)
        : undefined;

      const city: CityLocation = presetMatch ?? {
        id: parsed.data.id ?? `loc-${parsed.data.lat.toFixed(2)}-${parsed.data.lon.toFixed(2)}`,
        name: parsed.data.name,
        country: parsed.data.country,
        region: parsed.data.region,
        latitude: parsed.data.lat,
        longitude: parsed.data.lon,
        winterNote:
          'Real-time particulate telemetry paired with winter inversion and ventilation modeling.',
      };

      const snapshot = await fetchAirQualitySnapshot(city);
      res.json(snapshot);
    },
  );

  app.post(
    '/api/assistant/plan',
    createRateLimitMiddleware(aiLimiter),
    async (req, res) => {
      const parsed = planRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid household profile or air quality payload.',
          details: parsed.error.issues.map((i) => i.message),
        });
        return;
      }

      try {
        const plan = await generateTailoredSmogPlan(parsed.data);
        res.json(plan);
      } catch (error) {
        const mapped = mapGeminiError(error);
        res.status(mapped.status).json({ error: mapped.message });
      }
    },
  );

  app.post(
    '/api/assistant/chat',
    createRateLimitMiddleware(aiLimiter),
    async (req, res) => {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Please enter a valid question under 1,200 characters.',
        });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const writeEvent = (event: string, data: unknown): void => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        await streamSmogAdvisorReply(parsed.data, (chunkText) => {
          writeEvent('chunk', { text: chunkText });
        });
        writeEvent('done', { ok: true });
        res.end();
      } catch (error) {
        const mapped = mapGeminiError(error);
        writeEvent('error', { error: mapped.message, status: mapped.status });
        res.end();
      }
    },
  );

  // Unknown API routes return clean JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClearAir Winter server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
