import { describe, expect, it } from 'vitest'
import {
  deriveLearningAnalytics,
  getDateRangeBounds,
  isDateInRange,
} from './analyticsCalculations'
import type { Note } from './notesStore'
import type { PlannerTask } from './plannerStore'
import type { Quiz, QuizAttempt } from './quizStore'

describe('analyticsCalculations', () => {
  const today = '2026-10-17'

  const sampleQuiz: Quiz = {
    id: 'quiz-1',
    title: 'Cellular Respiration',
    subject: 'Biology',
    topic: 'Cell energy',
    difficulty: 'medium',
    source: 'manual',
    createdAt: '2026-10-10T10:00:00Z',
    questions: [
      { prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '' },
      { prompt: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: '' },
      { prompt: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: '' },
      { prompt: 'Q4', options: ['A', 'B', 'C', 'D'], correctIndex: 3, explanation: '' },
    ],
  }

  const sampleAttempts: QuizAttempt[] = [
    {
      quizId: 'quiz-1',
      answers: [0, 1, 2, 3],
      score: 100,
      correctCount: 4,
      completedAt: '2026-10-15T09:30:00Z', // 2 days ago
    },
    {
      quizId: 'quiz-1',
      answers: [0, 1, 2, 0],
      score: 75,
      correctCount: 3,
      completedAt: '2026-10-17T08:00:00Z', // today
    },
    {
      quizId: 'quiz-1',
      answers: [0, 1, 0, 0],
      score: 50,
      correctCount: 2,
      completedAt: '2026-09-01T12:00:00Z', // over a month ago
    },
  ]

  const sampleTasks: PlannerTask[] = [
    {
      id: 'task-1',
      title: 'Review Bio',
      subject: 'Biology',
      topic: 'Cell energy',
      date: '2026-10-17',
      durationMinutes: 30,
      priority: 'high',
      completed: true,
    },
    {
      id: 'task-2',
      title: 'Solve Equations',
      subject: 'Mathematics',
      topic: 'Quadratics',
      date: '2026-10-16',
      durationMinutes: 45,
      priority: 'medium',
      completed: true,
    },
    {
      id: 'task-3',
      title: 'History Essay',
      subject: 'History',
      topic: 'WWII',
      date: '2026-10-17',
      durationMinutes: 20,
      priority: 'low',
      completed: false,
    },
  ]

  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      title: 'Bio Notes',
      subject: 'Biology',
      topic: 'Cell energy',
      content: 'Important bio details',
      createdAt: '2026-10-17T09:00:00Z',
      updatedAt: '2026-10-17T09:00:00Z',
      isRead: true,
      isDemoData: false,
    },
  ]

  describe('getDateRangeBounds & isDateInRange', () => {
    it('calculates 7-day window properly', () => {
      const bounds = getDateRangeBounds('7d', today)
      expect(bounds.startDate).toBe('2026-10-11')
      expect(bounds.endDate).toBe('2026-10-17')
      expect(isDateInRange('2026-10-10', bounds.startDate, bounds.endDate)).toBe(false)
      expect(isDateInRange('2026-10-11', bounds.startDate, bounds.endDate)).toBe(true)
      expect(isDateInRange('2026-10-17', bounds.startDate, bounds.endDate)).toBe(true)
    })

    it('calculates 30-day window properly', () => {
      const bounds = getDateRangeBounds('30d', today)
      expect(bounds.startDate).toBe('2026-09-18')
      expect(bounds.endDate).toBe('2026-10-17')
      expect(isDateInRange('2026-09-17', bounds.startDate, bounds.endDate)).toBe(false)
      expect(isDateInRange('2026-09-18', bounds.startDate, bounds.endDate)).toBe(true)
    })

    it('handles all-time range without start boundary', () => {
      const bounds = getDateRangeBounds('all', today)
      expect(bounds.startDate).toBeNull()
      expect(bounds.endDate).toBe('2026-10-17')
      expect(isDateInRange('2020-01-01', bounds.startDate, bounds.endDate)).toBe(true)
    })
  })

  describe('deriveLearningAnalytics with empty / no-history state', () => {
    it('returns structured empty state without crashing when user has no records', () => {
      const analytics = deriveLearningAnalytics({
        quizzes: [],
        attempts: [],
        plannerTasks: [],
        notes: [],
        filter: '7d',
        today,
      })

      expect(analytics.hasRealData).toBe(false)
      expect(analytics.totalQuizzesCompleted).toBe(0)
      expect(analytics.averageQuizAccuracy).toBeNull()
      expect(analytics.highQuizScore).toBeNull()
      expect(analytics.totalStudyMinutes).toBe(0)
      expect(analytics.totalStudyHours).toBe('0.0')
      expect(analytics.totalPlannedTasks).toBe(0)
      expect(analytics.completedTasksCount).toBe(0)
      expect(analytics.taskCompletionRate).toBeNull()
      expect(analytics.quizAccuracyOverTime).toHaveLength(0)
      expect(analytics.activityHistory).toHaveLength(0)
      expect(analytics.currentStreak).toBe(0)
    })
  })

  describe('deriveLearningAnalytics with real records', () => {
    it('filters quizzes and calculates accuracy and moving average in 7d range', () => {
      const analytics = deriveLearningAnalytics({
        quizzes: [sampleQuiz],
        attempts: sampleAttempts,
        plannerTasks: sampleTasks,
        notes: sampleNotes,
        filter: '7d',
        today,
      })

      expect(analytics.hasRealData).toBe(true)
      // Only 2 attempts occurred within the last 7 days (Oct 15 and Oct 17)
      expect(analytics.totalQuizzesCompleted).toBe(2)
      // Average score: (100 + 75) / 2 = 88%
      expect(analytics.averageQuizAccuracy).toBe(88)
      expect(analytics.highQuizScore).toBe(100)
      expect(analytics.perfectQuizzesCount).toBe(1)
      expect(analytics.quizAccuracyOverTime).toHaveLength(2)

      // Check moving average calculation
      expect(analytics.quizAccuracyOverTime[0].score).toBe(100)
      expect(analytics.quizAccuracyOverTime[0].movingAverage).toBe(100)
      expect(analytics.quizAccuracyOverTime[1].score).toBe(75)
      expect(analytics.quizAccuracyOverTime[1].movingAverage).toBe(88)
    })

    it('includes all attempts when filter is set to all', () => {
      const analytics = deriveLearningAnalytics({
        quizzes: [sampleQuiz],
        attempts: sampleAttempts,
        plannerTasks: sampleTasks,
        notes: sampleNotes,
        filter: 'all',
        today,
      })

      // All 3 attempts included
      expect(analytics.totalQuizzesCompleted).toBe(3)
      // Average score: (100 + 75 + 50) / 3 = 75%
      expect(analytics.averageQuizAccuracy).toBe(75)
      expect(analytics.quizAccuracyOverTime).toHaveLength(3)
    })

    it('calculates study time and task completion correctly', () => {
      const analytics = deriveLearningAnalytics({
        quizzes: [sampleQuiz],
        attempts: sampleAttempts,
        plannerTasks: sampleTasks,
        notes: sampleNotes,
        filter: '7d',
        today,
      })

      // 3 tasks planned in window (Oct 16 and Oct 17)
      expect(analytics.totalPlannedTasks).toBe(3)
      // 2 completed (30m + 45m = 75m)
      expect(analytics.completedTasksCount).toBe(2)
      expect(analytics.totalStudyMinutes).toBe(75)
      expect(analytics.totalStudyHours).toBe('1.3')
      expect(analytics.taskCompletionRate).toBe(67) // 2/3 = 67%
      expect(analytics.tasksByPriority).toEqual({ high: 1, medium: 1, low: 0 })
    })

    it('computes subject-wise performance breakdown', () => {
      const analytics = deriveLearningAnalytics({
        quizzes: [sampleQuiz],
        attempts: sampleAttempts,
        plannerTasks: sampleTasks,
        notes: sampleNotes,
        filter: '7d',
        today,
      })

      const bio = analytics.subjectPerformance.find((s) => s.subject === 'Biology')
      expect(bio).toBeDefined()
      expect(bio?.quizzesAttempted).toBe(2)
      expect(bio?.averageAccuracy).toBe(88)
      expect(bio?.studyMinutes).toBe(30)
      expect(bio?.notesCount).toBe(1)
      expect(bio?.status).toBe('Excelling') // >= 85%

      const math = analytics.subjectPerformance.find((s) => s.subject === 'Mathematics')
      expect(math).toBeDefined()
      expect(math?.studyMinutes).toBe(45)
      expect(math?.status).toBe('No Quizzes')
    })

    it('builds chronological activity history', () => {
      const analytics = deriveLearningAnalytics({
        quizzes: [sampleQuiz],
        attempts: sampleAttempts,
        plannerTasks: sampleTasks,
        notes: sampleNotes,
        filter: '7d',
        today,
      })

      expect(analytics.activityHistory.length).toBeGreaterThan(0)
      // Verify items are ordered newest to oldest
      for (let i = 0; i < analytics.activityHistory.length - 1; i++) {
        expect(analytics.activityHistory[i].timestamp >= analytics.activityHistory[i + 1].timestamp).toBe(true)
      }
    })
  })
})
