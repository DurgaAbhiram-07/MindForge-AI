import { describe, expect, it } from 'vitest'
import type { Note } from './notesStore'
import type { Quiz, QuizAttempt } from './quizStore'
import { deriveWeaknessAnalytics, WEAKNESS_THRESHOLDS } from './weaknessAnalytics'

const quiz: Quiz = {
  id: 'quiz-biology', title: 'Cell energy', subject: 'Biology', topic: 'Cell energy', difficulty: 'medium', source: 'manual', createdAt: '2026-02-01T10:00:00.000Z',
  questions: [0, 1, 2, 3].map((correctIndex) => ({ prompt: `Question ${correctIndex}`, options: ['a', 'b', 'c', 'd'] as [string, string, string, string], correctIndex, explanation: 'Because.' })),
}
const note: Note = { id: 'note-cell-energy', title: 'Cell energy notes', subject: 'Biology', topic: 'Cell energy', content: 'Review.', createdAt: '2026-02-01T10:00:00.000Z', updatedAt: '2026-02-01T10:00:00.000Z', isRead: false, isDemoData: false }

const attempt = (answers: number[]): QuizAttempt => ({ quizId: quiz.id, answers, score: 0, correctCount: 0, completedAt: '2026-02-02T10:00:00.000Z' })

describe('deriveWeaknessAnalytics', () => {
  it('uses answered question data and marks a topic weak below the transparent threshold', () => {
    const result = deriveWeaknessAnalytics([quiz], [attempt([0, 0, 0, 3])])
    expect(result.topics[0]).toMatchObject({ attemptedQuestions: 4, correctQuestions: 2, accuracy: 50, status: 'weak' })
  })

  it('does not label a topic weak until enough questions have been answered', () => {
    const result = deriveWeaknessAnalytics([quiz], [attempt([0, -1, -1, -1])])
    expect(result.topics[0]).toMatchObject({ attemptedQuestions: 1, accuracy: 100, status: 'not-enough-data' })
    expect(WEAKNESS_THRESHOLDS.minimumQuestions).toBe(3)
  })

  it('links matching notes and quizzes to each topic', () => {
    const result = deriveWeaknessAnalytics([quiz], [attempt([0, 0, 0, 0])], [note])
    expect(result.recommendations[result.topics[0].key]).toEqual([
      { type: 'note', id: note.id, title: note.title, detail: 'Study material' },
      { type: 'quiz', id: quiz.id, title: quiz.title, detail: '4 questions · medium' },
    ])
  })

  it('ignores attempts for deleted or unknown quizzes', () => {
    expect(deriveWeaknessAnalytics([], [attempt([0, 0, 0, 0])])).toEqual({ topics: [], recommendations: {} })
  })
})
