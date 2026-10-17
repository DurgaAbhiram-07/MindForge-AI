# MindForge AI

> Learn Smarter. Think Deeper. Achieve More.

MindForge AI is a premium, personalized learning workspace. The current slice provides a responsive dashboard, study materials, interactive quizzes, and transparent weak-topic signals using locally persisted data. Real AI integrations will be added only behind an explicit provider boundary in a later phase.

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
- Weak Topics progress view derived from question-level quiz answers, with explicit minimum-sample and accuracy thresholds
- Personalized next-step links to matching study notes and quizzes; no derived weakness results are persisted
- Personalized Study Planner with persisted task CRUD, weekly schedule, Today/Upcoming/Completed views, conflict warnings, daily goal progress, and transparent weak-topic review suggestions
- Dedicated Learning Analytics workspace with real persisted metrics: quiz accuracy over time, total quizzes, study time, task completion rate, subject-wise breakdown, and unified chronological audit trail
- Timeframe filters for 7 days, 30 days, and all time with continuous timelines, accessible SVG charts, and resilient empty states
- Transparent XP and 10-tier Level Progression system with strict idempotency (no duplicate awards on refresh or re-opening)
- Accurate local calendar date streak tracking that accounts for missed days, timezone boundaries, and leap years
- Achievement gallery with 11 unlockable milestones, progress tracking, unlock timestamps, and XP rewards
- Unified single-source-of-truth dashboard integration connecting real streak, accuracy, and XP rank
- Accessible labels for primary controls
- Reproducible Node.js, npm, test, lint, typecheck, build, and Docker configuration

## Technology

- React + TypeScript + Vite
- Tailwind CSS v4 via the Vite plugin
- Zustand with localStorage persistence for dashboard state
- Separate persisted Zustand notes store under the `mindforge-notes` key
- Separate persisted Zustand quiz store under the `mindforge-quizzes` key, including compatible topic metadata for older quizzes
- Pure local weakness analytics derived from quizzes, attempts, and notes
- Separate persisted Zustand planner store under the `mindforge-planner` key with safe task and preference sanitization
- Separate persisted Zustand gamification store under the `mindforge-gamification` key with idempotent transaction ledger and unlocked milestones
- Deterministic Learning Analytics calculation engine (`src/store/analyticsCalculations.ts`)
- Local calendar date and streak calculation engine (`src/store/streakCalculations.ts`)
- Recharts + accessible SVG charts with ARIA tables for screen readers
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
4. Interactive quiz engine
5. Weak-topic detection based on quiz performance
6. Personalized study planner
7. Learning analytics, gamification, and achievements (completed)
8. Optional real AI provider integration with explicit AI-generated labeling

## Quiz generation limitations

Quiz generation from notes is deterministic local recall generation. It reads note fields and creates four-option questions without calling an AI model, network service, or backend. It does not infer meaning, verify facts, or adapt difficulty. Manually authored quizzes are the reliable path for precise assessment content.

## Weak-topic analytics limitations

The Weak Topics view calculates descriptive signals from each answered question in saved quiz attempts. Unanswered questions are excluded, attempts for deleted quizzes are ignored, and a topic is shown as `Not enough data` until at least three questions have been answered. With enough data, topics below 70% accuracy are marked `weak`, topics from 70% through 84% are `developing`, and topics at 85% or higher are `strong`. These thresholds are defined in `src/store/weaknessAnalytics.ts` and the result is recomputed from source data rather than stored as a second source of truth.

## Study planner limitations

Planner recommendations are deterministic local rules, not a connected AI service. The assistant orders incomplete tasks by overdue status, high priority, weak/developing topic matches, and schedule order. Timed tasks are checked for same-day overlaps before saving. Tasks, links, and the daily goal are stored locally under `mindforge-planner`; no account sync or remote calendar integration is included.

## Learning analytics limitations & transparency

Learning analytics are strictly descriptive calculations computed on the fly from verified local browser records:
- **No Predictive AI / Machine Learning**: No synthetic estimations, black-box predictions, or inferred metrics are produced. All numbers reflect actual persisted actions taken on this device.
- **Distinction of Zero vs Unavailable**: When no quizzes have been attempted or no study sessions planned, metrics clearly report unavailable (`—` or `null`) rather than misleading zeros.
- **Continuous Timelines**: Date-filtered charts (7 days, 30 days) render continuous daily buckets so days with zero study time are clearly visible without altering historical records.

## XP policy and gamification rules

MindForge uses a transparent, idempotent XP system:
- **Quiz Completion**: +50 base XP + 10 XP per correct question + 30 XP bonus for a 100% perfect score.
- **Planner Study Sessions**: +20 base XP + 1 XP per 2 minutes planned duration (minimum 25 XP).
- **Authoring Notes**: +25 XP when creating a new study note.
- **Daily Study Goal**: +40 XP when completed session minutes hit or exceed the daily goal.
- **Milestone Badges**: +40 to +120 XP upon unlocking achievements.
- **Idempotency Guarantee**: Every transaction is logged with a unique `sourceId` (e.g., `quiz-attempt-{quizId}-{timestamp}`). Refreshing a page, editing an existing note, or re-running an attempt never awards duplicate XP.
- **Level Thresholds**: Ranks range from Level 1 (*Novice Scholar*, 0 XP) through Level 10 (*MindForge Grandmaster*, 3200+ XP) with transparent progression percentages.

## Streak and calendar date rules

Streaks are computed in the user's local timezone using `YYYY-MM-DD` calendar keys:
- If active today, the streak includes today plus all unbroken preceding days.
- If not active today, but active yesterday, the streak remains alive in an active status awaiting today's session.
- If yesterday was missed, the current streak resets to 0, while the historical longest streak is preserved.
- Leap years, month boundaries, and year transitions are calculated accurately via local calendar date math.

## Buildathon submission readiness & QA verification

MindForge AI has completed rigorous Phase 7 quality assurance across all components and user flows:

- **Full Functional Coverage**: All 7 primary workspace views (Dashboard, Study Materials, Quizzes, Weakness Detection, Study Planner, Learning Analytics, and Achievements) are fully functional, responsive, and locally persisted.
- **Automated Verification Suite**:
  - `npm run lint`: ESLint passes with 0 warnings and 0 errors.
  - `npx tsc --noEmit`: TypeScript strict typecheck passes with 0 errors.
  - `npm test`: 11 test suites and 78 tests pass completely with zero regressions.
  - `npm run build`: Production bundle built cleanly via Vite (`dist/` static bundle).
- **Security & Privacy Audit**:
  - `npm audit`: 0 vulnerabilities found.
  - Git secret scan: Zero secrets or API keys committed in git tree.
  - `.env` files with credentials are strictly excluded via `.gitignore`. A safe `.env.example` template is provided.
  - Offline-first architecture: All user notes, quizzes, tasks, and achievements remain strictly on the user's local device in browser `localStorage`.
- **Docker & Reproducibility**:
  - Multi-stage `Dockerfile` with multi-platform Node 22 Alpine runtime and reproducible `npm ci` build.
  - Production container exposes port 4173 running `npm run preview -- --host 0.0.0.0`.
- **Ethical AI & Transparency**:
  - Zero fake AI claims: All heuristic algorithms (deterministic quiz generation, weakness thresholds, priority planning, streak tracking, analytics) are explicitly labeled with their exact rules and limitations.

