import { beforeEach, describe, expect, it } from 'vitest'
import type { Note } from './notesStore'
import {
  calculateQuizScore,
  createInitialQuizState,
  createManualQuiz,
  createRetryAnswers,
  generateQuizFromNote,
  LOCAL_QUIZ_GENERATION_NOTICE,
  QUIZ_GENERATION_LIMITATIONS,
  useQuizStore,
  validateManualQuizInput,
} from './quizStore'

const note: Note = {
  id: 'note-study-skills',
  title: 'Retrieval practice basics',
  subject: 'Learning science',
  topic: 'Retrieval practice',
  content: 'Retrieval practice strengthens memory by asking learners to recall information instead of only rereading it.',
  createdAt: '2026-02-01T10:00:00.000Z',
  updatedAt: '2026-02-02T10:00:00.000Z',
  isRead: false,
  isDemoData: false,
}

const manualInput = {
  title: 'Biology checkpoint',
  subject: 'Biology',
  difficulty: 'medium',
  questions: [{
    prompt: 'Which process releases energy from glucose?',
    options: ['Cellular respiration', 'Photosynthesis', 'Mitosis', 'Diffusion'],
    correctIndex: 0,
    explanation: 'Cellular respiration releases usable energy from glucose.',
  }],
} as const

describe('quiz creation helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    useQuizStore.setState(createInitialQuizState())
  })

  it('rejects missing fields and questions without exactly four unique options', () => {
    expect(validateManualQuizInput({ title: '', subject: 'Biology', difficulty: 'easy', questions: [] })).toEqual([
      'A title is required.',
      'At least one question is required.',
    ])
    expect(createManualQuiz({
      ...manualInput,
      questions: [{ ...manualInput.questions[0], options: ['one', 'two', 'three'] }],
    })).toBeNull()
    expect(useQuizStore.getState().createManualQuiz({
      ...manualInput,
      questions: [{ ...manualInput.questions[0], correctIndex: 4 }],
    })).toBe('')
  })

  it('creates a typed manual quiz with its source marked as manual', () => {
    const quiz = createManualQuiz(manualInput, '2026-02-03T10:00:00.000Z', 'quiz-manual-1')

    expect(quiz).toMatchObject({
      id: 'quiz-manual-1',
      title: 'Biology checkpoint',
      source: 'manual',
      createdAt: '2026-02-03T10:00:00.000Z',
    })
    expect(quiz?.questions[0].options).toHaveLength(4)
  })
})

describe('local note quiz generation', () => {
  it('is deterministic, uses note fields, and always emits four-option questions', () => {
    const first = generateQuizFromNote(note)
    const second = generateQuizFromNote(note)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      title: 'Retrieval practice basics · Quick quiz',
      subject: 'Learning science',
      source: 'notes',
      sourceNoteId: 'note-study-skills',
    })
    expect(first?.questions).toHaveLength(4)
    expect(first?.questions.every((question) => question.options.length === 4 && question.explanation.includes('directly'))).toBe(true)
    expect(first?.questions.map((question) => question.options[question.correctIndex])).toContain('Retrieval practice')
  })

  it('documents the local, recall-based limitations instead of implying AI understanding', () => {
    expect(LOCAL_QUIZ_GENERATION_NOTICE).toContain('No AI model')
    expect(QUIZ_GENERATION_LIMITATIONS).toContain('does not infer meaning')
    expect(generateQuizFromNote({ ...note, content: '' })?.questions[3].options).toHaveLength(4)
  })
})

describe('quiz scoring, attempts, persistence, and retry', () => {
  beforeEach(() => {
    localStorage.clear()
    useQuizStore.setState(createInitialQuizState())
  })

  it('calculates score and returns a fresh unanswered state for retry', () => {
    const quiz = generateQuizFromNote(note)
    if (!quiz) throw new Error('expected generated quiz')
    const answers = quiz.questions.map((question, index) => index === 0 ? question.correctIndex : -1)

    expect(calculateQuizScore(quiz, answers)).toEqual({ score: 25, correctCount: 1 })
    const retry = createRetryAnswers(quiz)
    expect(retry).toEqual([-1, -1, -1, -1])
    retry[0] = 3
    expect(createRetryAnswers(quiz)).toEqual([-1, -1, -1, -1])
  })

  it('saves attempts with calculated results and persists only quiz data under its own key', () => {
    const quizId = useQuizStore.getState().createQuizFromNote(note)
    const quiz = useQuizStore.getState().quizzes[0]
    const answers = quiz.questions.map((question) => question.correctIndex)
    const attempt = useQuizStore.getState().saveAttempt(quizId, answers, '2026-02-04T10:00:00.000Z')

    expect(attempt).toEqual({
      quizId,
      answers,
      score: 100,
      correctCount: 4,
      completedAt: '2026-02-04T10:00:00.000Z',
    })
    expect(useQuizStore.getState().attempts).toHaveLength(1)
    const persisted = JSON.parse(localStorage.getItem('mindforge-quizzes') ?? '{}') as { state?: { attempts?: unknown[] } }
    expect(persisted.state?.attempts).toHaveLength(1)
    expect(localStorage.getItem('mindforge-notes')).toBeNull()
  })

  it('returns null for attempts that do not match a quiz', () => {
    expect(useQuizStore.getState().saveAttempt('missing', [])).toBeNull()
    expect(useQuizStore.getState().retryQuiz('missing')).toEqual([])
  })

  it('falls back safely when persisted quiz data is malformed or invalid', () => {
    localStorage.setItem('mindforge-quizzes', '{not-json')
    useQuizStore.persist.rehydrate()
    expect(useQuizStore.getState()).toMatchObject(createInitialQuizState())

    localStorage.setItem('mindforge-quizzes', JSON.stringify({
      state: {
        quizzes: [{ id: 'bad', source: 'notes', questions: [{ options: ['only one'] }] }],
        attempts: [{ answers: ['bad'], score: 400 }],
      },
      version: 0,
    }))
    useQuizStore.persist.rehydrate()
    expect(useQuizStore.getState().quizzes).toEqual([])
    expect(useQuizStore.getState().attempts).toEqual([])
  })
})
