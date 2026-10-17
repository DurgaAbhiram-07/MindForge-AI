import { beforeEach, describe, expect, it } from 'vitest'
import {
  calculateLevel,
  createInitialGamificationState,
  sanitizeGamificationState,
  useGamificationStore,
} from './gamificationStore'
import type { PlannerTask } from './plannerStore'
import type { Quiz, QuizAttempt } from './quizStore'

describe('gamificationStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useGamificationStore.setState(createInitialGamificationState())
  })

  describe('calculateLevel', () => {
    it('calculates Level 1 for 0 XP', () => {
      const res = calculateLevel(0)
      expect(res.level).toBe(1)
      expect(res.title).toBe('Novice Scholar')
      expect(res.currentXpInLevel).toBe(0)
      expect(res.levelProgressPercent).toBe(0)
      expect(res.nextLevelXp).toBe(100)
    })

    it('calculates Level 1 progress accurately', () => {
      const res = calculateLevel(50)
      expect(res.level).toBe(1)
      expect(res.currentXpInLevel).toBe(50)
      expect(res.levelProgressPercent).toBe(50)
    })

    it('promotes to Level 2 at 100 XP', () => {
      const res = calculateLevel(100)
      expect(res.level).toBe(2)
      expect(res.title).toBe('Curious Thinker')
      expect(res.currentXpInLevel).toBe(0)
      expect(res.levelProgressPercent).toBe(0)
      expect(res.nextLevelXp).toBe(250)
    })

    it('calculates mid-level progress for Level 3 (250-450 XP)', () => {
      const res = calculateLevel(350)
      expect(res.level).toBe(3)
      expect(res.title).toBe('Diligent Apprentice')
      expect(res.currentXpInLevel).toBe(100) // 350 - 250
      expect(res.levelProgressPercent).toBe(50) // 100 / 200
    })

    it('handles max level (Level 10) appropriately', () => {
      const res = calculateLevel(5000)
      expect(res.level).toBe(10)
      expect(res.title).toBe('MindForge Grandmaster')
      expect(res.nextLevelXp).toBeNull()
      expect(res.levelProgressPercent).toBe(100)
    })
  })

  describe('XP Award Idempotency', () => {
    it('awards XP on first call and ignores duplicate sourceId', () => {
      const store = useGamificationStore.getState()

      const first = store.awardXp({
        sourceId: 'task-123',
        eventType: 'task-completion',
        xp: 35,
        description: 'Completed math practice',
      })
      expect(first).toBe(true)
      expect(useGamificationStore.getState().transactions).toHaveLength(1)
      expect(useGamificationStore.getState().transactions[0].xp).toBe(35)

      // Duplicate attempt with same sourceId
      const second = store.awardXp({
        sourceId: 'task-123',
        eventType: 'task-completion',
        xp: 35,
        description: 'Completed math practice again',
      })
      expect(second).toBe(false)
      expect(useGamificationStore.getState().transactions).toHaveLength(1)
    })

    it('calculates quiz XP transparently with correct answer and perfect bonuses', () => {
      const quiz: Quiz = {
        id: 'quiz-bio-1',
        title: 'Cellular Biology',
        subject: 'Biology',
        topic: 'Cells',
        difficulty: 'easy',
        source: 'manual',
        createdAt: '2026-10-17T10:00:00Z',
        questions: [
          { prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '' },
          { prompt: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: '' },
        ],
      }

      const attempt: QuizAttempt = {
        quizId: quiz.id,
        answers: [0, 1],
        score: 100,
        correctCount: 2,
        completedAt: '2026-10-17T11:00:00Z',
      }

      const awarded = useGamificationStore.getState().awardQuizAttempt(attempt, quiz)
      expect(awarded).toBe(true)

      // Expected XP: 50 base + 2 * 10 (correct) + 30 (100% bonus) = 100 XP
      const tx = useGamificationStore.getState().transactions[0]
      expect(tx.xp).toBe(100)
      expect(tx.eventType).toBe('quiz-completion')

      // Second attempt with same quiz and timestamp is rejected idempotently
      const dup = useGamificationStore.getState().awardQuizAttempt(attempt, quiz)
      expect(dup).toBe(false)
    })

    it('calculates task completion XP based on duration with minimum threshold', () => {
      const task: PlannerTask = {
        id: 'planner-task-1',
        title: 'Review Physics',
        subject: 'Physics',
        topic: 'Thermodynamics',
        date: '2026-10-17',
        durationMinutes: 40,
        priority: 'high',
        completed: true,
      }

      useGamificationStore.getState().awardTaskCompletion(task)
      const tx = useGamificationStore.getState().transactions[0]
      // 20 base + 40 * 0.5 = 40 XP
      expect(tx.xp).toBe(40)
      expect(tx.eventType).toBe('task-completion')
    })
  })

  describe('Achievement Evaluation and Unlocking', () => {
    it('unlocks first-quiz and perfect-score achievements when criteria met', () => {
      const quiz: Quiz = {
        id: 'quiz-1',
        title: 'Math Check',
        subject: 'Math',
        topic: 'Algebra',
        difficulty: 'easy',
        source: 'manual',
        createdAt: '2026-10-17T10:00:00Z',
        questions: [{ prompt: 'Q1', options: ['1', '2', '3', '4'], correctIndex: 0, explanation: '' }],
      }

      const attempt: QuizAttempt = {
        quizId: quiz.id,
        answers: [0],
        score: 100,
        correctCount: 1,
        completedAt: '2026-10-17T10:05:00Z',
      }

      const newlyUnlocked = useGamificationStore.getState().evaluateAndUnlock({
        quizzes: [quiz],
        attempts: [attempt],
        plannerTasks: [],
        notes: [],
        dailyGoalMinutes: 60,
        currentStreak: 1,
        longestStreak: 1,
      })

      expect(newlyUnlocked.map((a) => a.id)).toContain('first-quiz')
      expect(newlyUnlocked.map((a) => a.id)).toContain('perfect-score')

      // Because first-quiz (+50 XP) and perfect-score (+100 XP) gave 150 XP, user is now Level 2!
      // Second evaluation unlocks 'level-2'
      const secondEval = useGamificationStore.getState().evaluateAndUnlock({
        quizzes: [quiz],
        attempts: [attempt],
        plannerTasks: [],
        notes: [],
        dailyGoalMinutes: 60,
        currentStreak: 1,
        longestStreak: 1,
      })
      expect(secondEval.map((a) => a.id)).toContain('level-2')

      // Third evaluation has nothing new to unlock
      const thirdEval = useGamificationStore.getState().evaluateAndUnlock({
        quizzes: [quiz],
        attempts: [attempt],
        plannerTasks: [],
        notes: [],
        dailyGoalMinutes: 60,
        currentStreak: 1,
        longestStreak: 1,
      })
      expect(thirdEval).toHaveLength(0)
    })

    it('unlocks streak-3 when streak reaches 3', () => {
      const newlyUnlocked = useGamificationStore.getState().evaluateAndUnlock({
        quizzes: [],
        attempts: [],
        plannerTasks: [],
        notes: [],
        dailyGoalMinutes: 60,
        currentStreak: 3,
        longestStreak: 3,
      })

      expect(newlyUnlocked.some((a) => a.id === 'streak-3')).toBe(true)
    })
  })

  describe('State Sanitization', () => {
    it('sanitizes corrupt or malformed state safely', () => {
      const corrupt = {
        transactions: [
          { id: '1', sourceId: 'src-1', xp: 50, eventType: 'quiz-completion', description: 'test', timestamp: '2026-10-17' },
          { id: '2', sourceId: 'src-1', xp: 50, eventType: 'duplicate', description: 'dup', timestamp: '2026-10-17' },
          { id: '3', sourceId: 'src-2', xp: -10, eventType: 'invalid', description: 'neg', timestamp: '2026-10-17' },
        ],
        unlockedAchievements: [
          { id: 'first-quiz', unlockedAt: '2026-10-17T10:00:00Z' },
          { id: 'first-quiz', unlockedAt: '2026-10-17T10:00:00Z' },
        ],
      }

      const sanitized = sanitizeGamificationState(corrupt)
      expect(sanitized.transactions).toHaveLength(1) // Duplicate and negative removed
      expect(sanitized.transactions[0].sourceId).toBe('src-1')
      expect(sanitized.unlockedAchievements).toHaveLength(1) // Duplicate achievement removed
    })
  })
})
