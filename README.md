# ClearAir Winter

**A GenAI-powered winter smog and urban air pollution dashboard tailored for Indian families, senior citizens, and RWA communities.**

Severe winter temperature inversions trap particulate matter ($\text{PM}_{2.5}$ / $\text{PM}_{10}$) across Indian cities from November through February. **ClearAir Winter** combines live local air-quality telemetry, weather inversion modeling, and Gemini-powered personalized guidance to help households adopt low-emission daily routines, affordable indoor air hacks, and sustainable alternatives—while transparently quantifying the direct health, emissions, and Indian Rupee (`₹`) savings of every choice.

---

## Key Features

### 1. Live Indian City Telemetry & Ventilation Timing
- **Real-time air quality & weather** via Open-Meteo (with automatic seasonal winter baseline fallback if upstream APIs are unreachable).
- **Preloaded major Indian cities** (New Delhi, Gurugram, Noida, Lucknow, Kanpur, Patna, Kolkata, Mumbai, Bengaluru) plus live search for any city worldwide.
- **24-Hour $\text{PM}_{2.5}$ & Ventilation Forecast** that highlights the cleanest 2-hour daytime dispersal window so families know *when* to air rooms and *when* to keep balcony doors shut.

### 2. Senior-Friendly & Indian Household Design
- **Today’s Simple Advice Card**: A calm, plain-language daily guidance summary at the top of the dashboard designed so grandparents and older adults can read actionable guidance at a glance.
- **Persistent "Larger Text" Mode**: One-click root typography scaling (`18px` base) in the sidebar and mobile drawer that scales the entire interface cleanly without layout clipping.
- **Indian Home & Lifestyle Profile**: Customize home type (RWA flat, independent kothi, builder floor), commute (petrol/CNG car, diesel SUV, scooter/motorbike, Metro/bus/auto), winter warming (razai/curtains, oil-filled heater, angithi), kitchen fuel (LPG/PNG gas, induction, chulha), purifier access, and sensitive family members (senior citizens 60+, children, asthma, pregnancy).
- **100% Indian Rupees (`₹` INR)**: Every DIY filter cost, monthly fuel/LPG saving, and society-wide estimate uses Indian numbering (`en-IN`, e.g., `₹18,850`) with zero USD figures.

### 3. GenAI Personalized Action Plan & Streaming Advisor
- **One-Click Tailored Family Plan (`POST /api/assistant/plan`)**: Uses structured JSON generation with `gemini-4-hydrogen` to produce 6 concrete, location-aware actions spanning **Daily Routines**, **Indoor Air Tips**, and **Cleaner Habits**, each with step-by-step instructions and direct impact explanations.
- **Interactive Streaming Advisor (`POST /api/assistant/chat`)**: Server-Sent Events (SSE) chat grounded in the family’s exact city, live AQI/$\text{PM}_{2.5}$, inversion window, and household setup, with senior-friendly starter prompts.

### 4. Quantified Household & RWA Society Impact
- **Direct Choice Attribution**: Toggling any habit immediately recalculates projected indoor $\text{PM}_{2.5}$ reduction, daily cigarette-equivalent smoke avoided, monthly $\text{CO}_2\text{e}$ and local $\text{PM}_{2.5}$ prevented, and estimated monthly `₹` savings.
- **Budget DIY Air Cleaner Guide**: Room-by-room Indian market comparison (`₹2,400 – ₹9,200`) for building high-CADR fan + HEPA/MERV-13 filter setups versus `₹12,000–₹20,000` branded purifiers.
- **RWA Community Ripple & WhatsApp Brief**: Slide from 1 flat to 500 society flats to visualize collective clean-air gains and copy a ready-to-share RWA WhatsApp message in one click.

---

## Evaluation Criteria Alignment

| Criterion | Implementation Highlights |
| :--- | :--- |
| **Problem Statement Alignment** | Directly connects local winter smog & thermal inversions to low-emission daily routines, affordable indoor air hacks, sustainable Indian alternatives, and transparent direct impact math (health + emissions + `₹` savings). |
| **Code Quality** | Strict TypeScript across frontend, domain logic, and Express backend; pure calculation and normalization modules decoupled from React components; modular UI views and React Error Boundary recovery. |
| **Security** | Server-side-only `GEMINI_API_KEY` (never exposed to client bundles), Zod request validation on every API route, HTTPS host-allowlist SSRF guard (`open-meteo.com` only), sliding-window IP rate limiting, `64kb` JSON payload cap, control-character sanitization, and defensive HTTP headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). |
| **Efficiency** | Bounded in-memory TTL cache for air quality & geocoding responses, `ThinkingLevel.LOW` for low-latency Gemini responses, SSE streaming for chat, zero heavy charting dependencies (custom lightweight accessible SVG chart), and memoized client calculations. |
| **Testing** | 16 deterministic automated unit tests (`node:test` via `tsx --test`) covering EPA AQI breakpoints, inversion modeling, ventilation window detection, household/RWA impact math, `₹` INR formatting, AI payload normalization, SSRF blocking, Zod validation, rate limiting, and TTL caching. |
| **Accessibility** | WCAG-focused semantic HTML landmarks (`<aside>`, `<nav>`, `<main>`, `<header>`), skip-to-content link, `aria-live="polite"` status announcements, high-contrast 3px `:focus-visible` outlines, generous `44px–52px` touch targets, keyboard-navigable hourly chart bars, and persistent **Larger Text** mode for senior citizens. |

---

## Architecture & Project Structure

```text
├── server.ts                        # Express server, security middleware, API routes, Vite dev / static prod serving
├── server/
│   ├── airQualityService.ts         # Open-Meteo live AQI, weather & geocoding client with TTL cache & baseline fallback
│   ├── geminiService.ts             # Server-side @google/genai integration (structured JSON plan + SSE streaming chat)
│   ├── security.ts                  # Zod schemas, SSRF allowlist guard, text sanitizer, rate limiter & TTL cache
│   └── security.test.ts             # Unit tests for SSRF protection, Zod validation, rate limiter & cache
├── src/
│   ├── App.tsx                      # Dashboard shell, navigation, Larger Text toggle, state persistence & views
│   ├── main.tsx                     # React entry point wrapped in ErrorBoundary
│   ├── index.css                    # Tailwind CSS v4 theme, typography tokens & accessible focus/scaling rules
│   ├── domain/
│   │   ├── types.ts                 # Shared TypeScript interfaces for air quality, profiles, actions & impacts
│   │   ├── airQuality.ts            # US EPA PM2.5 AQI math, inversion scoring, ventilation windows & senior headlines
│   │   ├── airQuality.test.ts       # Unit tests for air quality & health guidance logic
│   │   ├── impactCalculator.ts      # Indoor PM2.5 & RWA savings model, ₹ formatter & AI plan normalizer
│   │   └── impactCalculator.test.ts # Unit tests for impact math, INR formatting & malformed payload resilience
│   ├── services/
│   │   └── api.ts                   # Typed frontend API client with strict JSON validation & SSE reader
│   └── components/
│       ├── ActionCardList.tsx       # Filterable, searchable daily action checklist with expandable steps
│       ├── ErrorBoundary.tsx        # Senior-friendly fallback UI preventing blank-screen crashes
│       ├── HourlySmogChart.tsx      # Accessible interactive 24-hour PM2.5 & ventilation SVG chart
│       ├── HouseholdProfilePanel.tsx# Indian household & sensitive-member profile editor
│       ├── ImpactCommunityView.tsx  # Personal exposure bars, RWA scale slider, WhatsApp brief & savings ledger
│       ├── IndoorHacksGuide.tsx     # Indoor air tips + Indian DIY fan-filter budget table (₹)
│       ├── LocationSelectorModal.tsx# Major Indian cities picker + live city search modal
│       └── SmogAdvisorChat.tsx      # Streaming GenAI chat advisor with senior/RWA starter prompts
├── index.html                       # Document metadata & Google Fonts (Plus Jakarta Sans, Public Sans, JetBrains Mono)
├── package.json                     # Dependencies & npm scripts
└── .env.example                     # Environment variable template
```

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express 4, Zod 4, `tsx`
- **GenAI**: `@google/genai` SDK (`gemini-4-hydrogen` with structured JSON `responseSchema` and SSE streaming)
- **Live Environmental Data**: [Open-Meteo Air Quality, Weather & Geocoding APIs](https://open-meteo.com/) (no API key required)
- **Testing**: Node built-in test runner (`node:test` + `node:assert/strict`) executed via `tsx --test`

---

## Getting Started

### Prerequisites
- **Node.js 20+** (recommended Node 22+)
- A **Gemini API key** configured as `GEMINI_API_KEY` (required for AI-generated plans and streaming chat; live air quality, ventilation forecasts, and the interactive impact calculator work even without an API key)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and add your server-side Gemini API key:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

> **Security Note:** Never expose `GEMINI_API_KEY` with a `VITE_` prefix. All AI requests are proxied strictly through the Express backend.

### 3. Run in Development
```bash
npm run dev
```
The full-stack server (Express API + Vite frontend middleware) starts on **http://localhost:3000**.

### 4. Build & Run for Production
```bash
npm run build
NODE_ENV=production npm start
```

---

## Testing & Verification

Run the automated test suite (16 unit tests covering domain calculations, Indian Rupee formatting, payload normalization, SSRF blocking, Zod validation, rate limiting, and TTL caching):

```bash
npm test
```

Run TypeScript static type checking:

```bash
npm run lint
```

---

## API Endpoints

| Method & Path | Rate Limit | Description |
| :--- | :--- | :--- |
| `GET /api/health` | — | Health check returning server status and ISO timestamp. |
| `GET /api/air-quality` | 60 req/min | Fetches cached live Open-Meteo AQI, $\text{PM}_{2.5}$/$\text{PM}_{10}$/$\text{NO}_2$, wind, temperature, and 24-hour forecast for validated coordinates (`lat`, `lon`). Falls back cleanly to a seasonal winter baseline if unreachable. |
| `GET /api/locations/search` | 60 req/min | Geocodes city queries (`q`, 2–80 chars) via allowlisted Open-Meteo geocoding API. |
| `POST /api/assistant/plan` | 18 req/min | Validates household profile + air-quality context with Zod and returns a structured, normalized 6-action Indian winter smog plan in `₹` from Gemini. |
| `POST /api/assistant/chat` | 18 req/min | Streams contextual family air-quality guidance over Server-Sent Events (`text/event-stream`). |

---

## Disclaimer

ClearAir Winter provides environmental health education and practical low-emission household guidance—it is not a substitute for professional medical advice. Anyone experiencing chest tightness, severe wheezing, or acute breathing difficulty during high-pollution episodes should consult a qualified doctor promptly.
