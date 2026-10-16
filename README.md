# MindForge AI

> Learn Smarter. Think Deeper. Achieve More.

MindForge AI is a premium, personalized learning workspace. The current Phase 0 slice establishes a responsive dashboard shell with local, deterministic learning data. Real AI integrations will be added only behind an explicit provider boundary in a later phase.

## Current foundation

- Responsive dark dashboard shell
- Learning statistics, daily focus, streak, and knowledge score cards
- Recent activity list
- Functional navigation state and mobile navigation drawer
- Daily goal completion interaction
- Accessible labels for primary controls
- Reproducible Node.js, npm, test, lint, typecheck, build, and Docker configuration

## Technology

- React + TypeScript + Vite
- Tailwind CSS v4 via the Vite plugin
- Zustand for future persisted client state
- Recharts for upcoming progress visualizations
- Lucide React icons
- Vitest + React Testing Library
- ESLint + TypeScript compiler

## Requirements

- Node.js `22.20.0` (see `.nvmrc`)
- npm 10+
- Docker (optional, for container verification)

## Setup

```bash
git clone https://github.com/DurgaAbhiram-07/MindForge-AI.git
cd MindForge-AI
npm ci
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Run locally

```bash
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

Run the complete local verification set:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

The test suite is deterministic and does not require an API key, network service, or external AI provider.

## Docker

Build and run the production static preview:

```bash
docker build -t mindforge-ai .
docker run --rm -p 4173:4173 mindforge-ai
```

Then open `http://localhost:4173`.

## Environment variables

`.env.example` contains placeholders for future AI provider configuration. Never commit `.env` or real API keys. The current dashboard does not make AI calls.

## Delivery plan

1. Foundation and dashboard shell (current)
2. Study materials and subject organization
3. Quiz flow with scoring and explanations
4. Weak-topic detection based on quiz performance
5. Personalized study planner
6. Progress charts, achievements, and streak history
7. Optional real AI provider integration with explicit AI-generated labeling
