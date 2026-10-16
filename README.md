# MindForge AI

> Learn Smarter. Think Deeper. Achieve More.

MindForge AI is a premium, personalized learning workspace. The current Phase 1 slice provides a responsive dashboard with locally persisted, deterministic learning data. Real AI integrations will be added only behind an explicit provider boundary in a later phase.

## Current foundation

- Responsive dark dashboard shell
- Learning statistics for daily goals, study time, streak, quiz accuracy, and knowledge score
- Persisted study task progress and recent activity
- Demo-data notice that distinguishes local sample data from real AI output
- Functional navigation state and mobile navigation drawer
- Daily study task completion with immediate progress updates and feedback
- Safe localStorage handling for unavailable or malformed saved data
- Functional recent-activity empty state and restore action
- Study Materials library with subject/topic organization, search, filters, and sorting
- Create, edit, read, and delete notes with local persistence and confirmation dialogs
- Readable note view with lightweight headings, paragraphs, and list formatting
- Interactive quiz engine with manual multiple-choice authoring, local note-based generation, scoring, review, retry, and persisted attempts
- Accessible labels for primary controls
- Reproducible Node.js, npm, test, lint, typecheck, build, and Docker configuration

## Technology

- React + TypeScript + Vite
- Tailwind CSS v4 via the Vite plugin
- Zustand with localStorage persistence for dashboard state
- Separate persisted Zustand notes store under the `mindforge-notes` key
- Separate persisted Zustand quiz store under the `mindforge-quizzes` key
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

1. Foundation and dashboard shell
2. Dashboard behavior and local persistence
3. Study materials and smart notes
4. Interactive quiz engine (current)
5. Weak-topic detection based on quiz performance
6. Personalized study planner
7. Progress charts, achievements, and streak history
8. Optional real AI provider integration with explicit AI-generated labeling

## Quiz generation limitations

Quiz generation from notes is deterministic local recall generation. It reads note fields and creates four-option questions without calling an AI model, network service, or backend. It does not infer meaning, verify facts, or adapt difficulty. Manually authored quizzes are the reliable path for precise assessment content.
