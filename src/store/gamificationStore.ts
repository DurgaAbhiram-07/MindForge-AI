import { create } from 'zustand'
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware'
import type { Note } from './notesStore'
import type { PlannerTask } from './plannerStore'
import type { Quiz, QuizAttempt } from './quizStore'
import { getTodayDate } from './streakCalculations'

export type XpEventType =
  | 'quiz-completion'
  | 'quiz-perfection'
  | 'quiz-correct-answer'
  | 'task-completion'
  | 'note-creation'
  | 'note-read'
  | 'goal-reached'
  | 'streak-bonus'
  | 'achievement-unlocked'

export type XpTransaction = {
  id: string
  sourceId: string
  eventType: XpEventType
  xp: number
  timestamp: string
  description: string
}

export type LevelThreshold = {
  level: number
  title: string
  minXp: number
  maxXp: number | null
}

export const LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, title: 'Novice Scholar', minXp: 0, maxXp: 100 },
  { level: 2, title: 'Curious Thinker', minXp: 100, maxXp: 250 },
  { level: 3, title: 'Diligent Apprentice', minXp: 250, maxXp: 450 },
  { level: 4, title: 'Knowledge Seeker', minXp: 450, maxXp: 700 },
  { level: 5, title: 'Focus Adept', minXp: 700, maxXp: 1000 },
  { level: 6, title: 'Concept Master', minXp: 1000, maxXp: 1400 },
  { level: 7, title: 'Insight Champion', minXp: 1400, maxXp: 1900 },
  { level: 8, title: 'Wisdom Keeper', minXp: 1900, maxXp: 2500 },
  { level: 9, title: 'Forge Virtuoso', minXp: 2500, maxXp: 3200 },
  { level: 10, title: 'MindForge Grandmaster', minXp: 3200, maxXp: null },
]

export const XP_POLICY = {
  quizCompletionBase: 50,
  quizPerCorrectAnswer: 10,
  quizPerfectScoreBonus: 30,
  taskCompletionBase: 20,
  taskPerMinuteRate: 0.5, // +1 XP per 2 minutes
  taskCompletionMin: 25,
  noteCreation: 25,
  noteRead: 10,
  dailyGoalReached: 40,
} as const

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type AchievementCategory = 'quizzes' | 'study' | 'streaks' | 'mastery'

export type AchievementDefinition = {
  id: string
  title: string
  description: string
  category: AchievementCategory
  tier: AchievementTier
  xpReward: number
  maxProgress: number
  getProgress: (context: EvaluationContext) => number
  isUnlocked: (context: EvaluationContext) => boolean
}

export type EvaluationContext = {
  quizzes: readonly Quiz[]
  attempts: readonly QuizAttempt[]
  plannerTasks: readonly PlannerTask[]
  notes: readonly Note[]
  dailyGoalMinutes: number
  currentStreak: number
  longestStreak: number
  totalXp: number
  level: number
  today?: string
}

export type UnlockedAchievement = {
  id: string
  unlockedAt: string
}

export type AchievementView = AchievementDefinition & {
  unlocked: boolean
  unlockedAt?: string
  progress: number
  progressPercent: number
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-quiz',
    title: 'First Steps',
    description: 'Complete your first quiz attempt.',
    category: 'quizzes',
    tier: 'bronze',
    xpReward: 50,
    maxProgress: 1,
    getProgress: (ctx) => Math.min(1, ctx.attempts.length),
    isUnlocked: (ctx) => ctx.attempts.length >= 1,
  },
  {
    id: 'quiz-enthusiast',
    title: 'Quiz Enthusiast',
    description: 'Complete 5 quiz attempts.',
    category: 'quizzes',
    tier: 'silver',
    xpReward: 75,
    maxProgress: 5,
    getProgress: (ctx) => Math.min(5, ctx.attempts.length),
    isUnlocked: (ctx) => ctx.attempts.length >= 5,
  },
  {
    id: 'perfect-score',
    title: 'Perfect Recall',
    description: 'Score 100% on any quiz.',
    category: 'quizzes',
    tier: 'gold',
    xpReward: 100,
    maxProgress: 1,
    getProgress: (ctx) => (ctx.attempts.some((a) => a.score === 100) ? 1 : 0),
    isUnlocked: (ctx) => ctx.attempts.some((a) => a.score === 100),
  },
  {
    id: 'subject-explorer',
    title: 'Subject Explorer',
    description: 'Complete quizzes across at least 2 different subjects.',
    category: 'quizzes',
    tier: 'silver',
    xpReward: 60,
    maxProgress: 2,
    getProgress: (ctx) => {
      const quizById = new Map(ctx.quizzes.map((q) => [q.id, q]))
      const subjects = new Set<string>()
      for (const attempt of ctx.attempts) {
        const quiz = quizById.get(attempt.quizId)
        if (quiz) subjects.add(quiz.subject.trim().toLowerCase())
      }
      return Math.min(2, subjects.size)
    },
    isUnlocked: (ctx) => {
      const quizById = new Map(ctx.quizzes.map((q) => [q.id, q]))
      const subjects = new Set<string>()
      for (const attempt of ctx.attempts) {
        const quiz = quizById.get(attempt.quizId)
        if (quiz) subjects.add(quiz.subject.trim().toLowerCase())
      }
      return subjects.size >= 2
    },
  },
  {
    id: 'first-task',
    title: 'Plan in Motion',
    description: 'Complete your first scheduled study planner task.',
    category: 'study',
    tier: 'bronze',
    xpReward: 40,
    maxProgress: 1,
    getProgress: (ctx) => Math.min(1, ctx.plannerTasks.filter((t) => t.completed).length),
    isUnlocked: (ctx) => ctx.plannerTasks.some((t) => t.completed),
  },
  {
    id: 'task-finisher-5',
    title: 'Study Marathon',
    description: 'Complete 5 scheduled study sessions.',
    category: 'study',
    tier: 'silver',
    xpReward: 80,
    maxProgress: 5,
    getProgress: (ctx) => Math.min(5, ctx.plannerTasks.filter((t) => t.completed).length),
    isUnlocked: (ctx) => ctx.plannerTasks.filter((t) => t.completed).length >= 5,
  },
  {
    id: 'daily-goal-crusher',
    title: 'Goal Crusher',
    description: 'Reach your daily study goal in completed session minutes.',
    category: 'study',
    tier: 'gold',
    xpReward: 60,
    maxProgress: 1,
    getProgress: (ctx) => {
      const today = ctx.today ?? getTodayDate()
      const todayMinutes = ctx.plannerTasks
        .filter((t) => t.completed && t.date === today)
        .reduce((sum, t) => sum + t.durationMinutes, 0)
      return todayMinutes >= ctx.dailyGoalMinutes ? 1 : 0
    },
    isUnlocked: (ctx) => {
      // Check if any single date has completed minutes >= dailyGoalMinutes
      const minutesByDate = new Map<string, number>()
      for (const task of ctx.plannerTasks) {
        if (!task.completed) continue
        const cur = minutesByDate.get(task.date) ?? 0
        minutesByDate.set(task.date, cur + task.durationMinutes)
      }
      for (const mins of minutesByDate.values()) {
        if (mins >= ctx.dailyGoalMinutes) return true
      }
      return false
    },
  },
  {
    id: 'streak-3',
    title: 'Momentum Builder',
    description: 'Maintain a 3-day learning streak.',
    category: 'streaks',
    tier: 'silver',
    xpReward: 50,
    maxProgress: 3,
    getProgress: (ctx) => Math.min(3, Math.max(ctx.currentStreak, ctx.longestStreak)),
    isUnlocked: (ctx) => Math.max(ctx.currentStreak, ctx.longestStreak) >= 3,
  },
  {
    id: 'streak-7',
    title: 'Unstoppable Scholar',
    description: 'Maintain a 7-day learning streak.',
    category: 'streaks',
    tier: 'gold',
    xpReward: 120,
    maxProgress: 7,
    getProgress: (ctx) => Math.min(7, Math.max(ctx.currentStreak, ctx.longestStreak)),
    isUnlocked: (ctx) => Math.max(ctx.currentStreak, ctx.longestStreak) >= 7,
  },
  {
    id: 'note-architect',
    title: 'Knowledge Creator',
    description: 'Create 3 or more study notes in your library.',
    category: 'mastery',
    tier: 'bronze',
    xpReward: 50,
    maxProgress: 3,
    getProgress: (ctx) => Math.min(3, ctx.notes.length),
    isUnlocked: (ctx) => ctx.notes.length >= 3,
  },
  {
    id: 'level-2',
    title: 'Rising Star',
    description: 'Reach Level 2 in MindForge.',
    category: 'mastery',
    tier: 'bronze',
    xpReward: 50,
    maxProgress: 1,
    getProgress: (ctx) => (ctx.level >= 2 ? 1 : 0),
    isUnlocked: (ctx) => ctx.level >= 2,
  },
]

export function calculateLevel(totalXp: number): {
  level: number
  title: string
  currentLevelMinXp: number
  nextLevelXp: number | null
  currentXpInLevel: number
  levelProgressPercent: number
  totalXp: number
} {
  const safeXp = Math.max(0, Math.round(totalXp))

  let currentTier = LEVEL_THRESHOLDS[0]
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const t = LEVEL_THRESHOLDS[i]
    if (safeXp >= t.minXp) {
      currentTier = t
    } else {
      break
    }
  }

  const { level, title, minXp, maxXp } = currentTier
  const currentXpInLevel = safeXp - minXp

  let levelProgressPercent = 100
  if (maxXp !== null) {
    const range = maxXp - minXp
    levelProgressPercent = Math.min(100, Math.max(0, Math.round((currentXpInLevel / range) * 100)))
  }

  return {
    level,
    title,
    currentLevelMinXp: minXp,
    nextLevelXp: maxXp,
    currentXpInLevel,
    levelProgressPercent,
    totalXp: safeXp,
  }
}

export type GamificationState = {
  transactions: XpTransaction[]
  unlockedAchievements: UnlockedAchievement[]
}

export type GamificationActions = {
  awardXp: (transaction: Omit<XpTransaction, 'id' | 'timestamp'> & { timestamp?: string }) => boolean
  evaluateAndUnlock: (context: Omit<EvaluationContext, 'totalXp' | 'level'>) => UnlockedAchievement[]
  awardQuizAttempt: (attempt: QuizAttempt, quiz: Quiz) => boolean
  awardTaskCompletion: (task: PlannerTask) => boolean
  awardNoteCreated: (note: Note) => boolean
  resetGamification: () => void
}

export type GamificationStore = GamificationState & GamificationActions

export const GAMIFICATION_STORAGE_KEY = 'mindforge-gamification'

export function createInitialGamificationState(): GamificationState {
  return {
    transactions: [],
    unlockedAchievements: [],
  }
}

const fallbackStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() {
    return 0
  },
}

function getSafeStorage(): Storage {
  if (typeof window === 'undefined') return fallbackStorage
  try {
    const storage = window.localStorage
    const probeKey = '__mindforge_gamification_probe__'
    storage.setItem(probeKey, 'ok')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return fallbackStorage
  }
}

const safeStorage = createJSONStorage(() => getSafeStorage())

function makeId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function sanitizeGamificationState(input: unknown): GamificationState {
  const defaults = createInitialGamificationState()
  if (!input || typeof input !== 'object') return defaults

  const candidate = (input as { state?: unknown }).state ?? input
  if (!candidate || typeof candidate !== 'object') return defaults

  const c = candidate as Partial<GamificationState>

  const seenSources = new Set<string>()
  const transactions = Array.isArray(c.transactions)
    ? c.transactions
        .filter((t): t is XpTransaction => {
          if (!t || typeof t !== 'object') return false
          if (typeof t.id !== 'string' || typeof t.sourceId !== 'string') return false
          if (typeof t.xp !== 'number' || !Number.isFinite(t.xp) || t.xp <= 0) return false
          if (typeof t.eventType !== 'string' || typeof t.description !== 'string') return false
          if (typeof t.timestamp !== 'string') return false
          if (seenSources.has(t.sourceId)) return false
          seenSources.add(t.sourceId)
          return true
        })
        .map((t) => ({ ...t, xp: Math.round(t.xp) }))
    : defaults.transactions

  const seenAchievements = new Set<string>()
  const unlockedAchievements = Array.isArray(c.unlockedAchievements)
    ? c.unlockedAchievements
        .filter((a): a is UnlockedAchievement => {
          if (!a || typeof a !== 'object') return false
          if (typeof a.id !== 'string' || typeof a.unlockedAt !== 'string') return false
          if (seenAchievements.has(a.id)) return false
          seenAchievements.add(a.id)
          return true
        })
    : defaults.unlockedAchievements

  return { transactions, unlockedAchievements }
}

export const useGamificationStore = create<GamificationStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...createInitialGamificationState(),

        awardXp: (item) => {
          const { sourceId, eventType, xp, description, timestamp } = item
          if (!sourceId || xp <= 0) return false

          const state = get()
          if (state.transactions.some((t) => t.sourceId === sourceId)) {
            return false // Idempotent: already awarded
          }

          const tx: XpTransaction = {
            id: makeId('xp'),
            sourceId,
            eventType,
            xp: Math.round(xp),
            description,
            timestamp: timestamp ?? new Date().toISOString(),
          }

          set({ transactions: [tx, ...state.transactions] })
          return true
        },

        awardQuizAttempt: (attempt, quiz) => {
          const sourceId = `quiz-attempt-${attempt.quizId}-${attempt.completedAt}`
          const state = get()
          if (state.transactions.some((t) => t.sourceId === sourceId)) {
            return false
          }

          // Calculate XP transparently according to policy
          let xp = XP_POLICY.quizCompletionBase
          xp += attempt.correctCount * XP_POLICY.quizPerCorrectAnswer
          if (attempt.score === 100) {
            xp += XP_POLICY.quizPerfectScoreBonus
          }

          return get().awardXp({
            sourceId,
            eventType: 'quiz-completion',
            xp,
            description: `Completed “${quiz.title}” (${attempt.score}% score)`,
            timestamp: attempt.completedAt,
          })
        },

        awardTaskCompletion: (task) => {
          const sourceId = `planner-task-${task.id}`
          const state = get()
          if (state.transactions.some((t) => t.sourceId === sourceId)) {
            return false
          }

          const durationBonus = Math.round(task.durationMinutes * XP_POLICY.taskPerMinuteRate)
          const xp = Math.max(XP_POLICY.taskCompletionMin, XP_POLICY.taskCompletionBase + durationBonus)

          return get().awardXp({
            sourceId,
            eventType: 'task-completion',
            xp,
            description: `Finished study session: ${task.title} (${task.durationMinutes} min)`,
            timestamp: new Date().toISOString(),
          })
        },

        awardNoteCreated: (note) => {
          const sourceId = `note-create-${note.id}`
          const state = get()
          if (state.transactions.some((t) => t.sourceId === sourceId)) {
            return false
          }

          return get().awardXp({
            sourceId,
            eventType: 'note-creation',
            xp: XP_POLICY.noteCreation,
            description: `Authored study material: ${note.title}`,
            timestamp: note.createdAt,
          })
        },

        evaluateAndUnlock: (rawContext) => {
          const state = get()
          const totalXp = state.transactions.reduce((sum, t) => sum + t.xp, 0)
          const levelInfo = calculateLevel(totalXp)
          const fullContext: EvaluationContext = {
            ...rawContext,
            totalXp,
            level: levelInfo.level,
          }

          const newlyUnlocked: UnlockedAchievement[] = []
          const existingIds = new Set(state.unlockedAchievements.map((a) => a.id))

          for (const def of ACHIEVEMENTS) {
            if (existingIds.has(def.id)) continue
            if (def.isUnlocked(fullContext)) {
              const now = new Date().toISOString()
              newlyUnlocked.push({ id: def.id, unlockedAt: now })
              // Award achievement XP idempotently
              get().awardXp({
                sourceId: `achievement-${def.id}`,
                eventType: 'achievement-unlocked',
                xp: def.xpReward,
                description: `Unlocked achievement: ${def.title}`,
                timestamp: now,
              })
            }
          }

          if (newlyUnlocked.length > 0) {
            set({
              unlockedAchievements: [...newlyUnlocked, ...state.unlockedAchievements],
            })
          }

          return newlyUnlocked
        },

        resetGamification: () => set(createInitialGamificationState()),
      }),
      {
        name: GAMIFICATION_STORAGE_KEY,
        storage: safeStorage,
        partialize: (state) => ({
          transactions: state.transactions,
          unlockedAchievements: state.unlockedAchievements,
        }),
        merge: (persisted, current) => ({ ...current, ...sanitizeGamificationState(persisted) }),
      },
    ),
  ),
)
