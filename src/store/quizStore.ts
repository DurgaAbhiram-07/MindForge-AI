import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Note } from './notesStore'

export type QuizQuestion = {
  prompt: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
}

export type Quiz = {
  id: string
  title: string
  subject: string
  difficulty: string
  questions: QuizQuestion[]
  source: 'manual' | 'notes'
  sourceNoteId?: string
  createdAt: string
}

export type QuizAnswers = number[]

export type QuizAttempt = {
  quizId: string
  answers: QuizAnswers
  score: number
  correctCount: number
  completedAt: string
}

export type QuizQuestionInput = {
  prompt: string
  options: readonly string[]
  correctIndex: number
  explanation: string
}

export type ManualQuizInput = {
  title: string
  subject: string
  difficulty: string
  questions: readonly QuizQuestionInput[]
}

export type QuizState = {
  quizzes: Quiz[]
  attempts: QuizAttempt[]
}

export type QuizActions = {
  createManualQuiz: (input: ManualQuizInput) => string
  createQuizFromNote: (note: Note) => string
  saveAttempt: (quizId: string, answers: readonly number[], completedAt?: string) => QuizAttempt | null
  retryQuiz: (quizId: string) => QuizAnswers
}

export type QuizStore = QuizState & QuizActions

export const QUIZ_STORAGE_KEY = 'mindforge-quizzes'
export const LOCAL_QUIZ_GENERATION_NOTICE =
  'Generated locally from the note title, subject, topic, and content. No AI model, network request, or remote service is used.'
export const QUIZ_GENERATION_LIMITATIONS =
  'Local generation uses deterministic field and sentence recall. It does not infer meaning, verify facts, or adapt difficulty.'

export function createInitialQuizState(): QuizState {
  return { quizzes: [], attempts: [] }
}

const fallbackStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() { return 0 },
}

function getSafeStorage(): Storage {
  if (typeof window === 'undefined') return fallbackStorage

  try {
    const storage = window.localStorage
    const probeKey = '__mindforge_quiz_storage_probe__'
    storage.setItem(probeKey, 'ok')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return fallbackStorage
  }
}

const safeStorage = createJSONStorage(() => getSafeStorage())

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidAnswer(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= -1 && value <= 3
}

function isQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value) || !isNonEmptyString(value.prompt) || !isNonEmptyString(value.explanation)) return false
  if (!Array.isArray(value.options) || value.options.length !== 4) return false
  if (!value.options.every(isNonEmptyString)) return false
  if (new Set(value.options.map((option) => option.trim().toLocaleLowerCase())).size !== 4) return false
  return typeof value.correctIndex === 'number' && Number.isInteger(value.correctIndex) && value.correctIndex >= 0 && value.correctIndex < 4
}

function parseQuiz(value: unknown): Quiz | null {
  if (!isRecord(value)) return null
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title) || !isNonEmptyString(value.subject)) return null
  if (!isNonEmptyString(value.difficulty) || !isTimestamp(value.createdAt)) return null
  if (value.source !== 'manual' && value.source !== 'notes') return null
  if (!Array.isArray(value.questions) || value.questions.length === 0 || !value.questions.every(isQuestion)) return null
  if (value.sourceNoteId !== undefined && !isNonEmptyString(value.sourceNoteId)) return null

  return {
    id: value.id.trim(),
    title: value.title.trim(),
    subject: value.subject.trim(),
    difficulty: value.difficulty.trim(),
    questions: value.questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()) as QuizQuestion['options'],
      correctIndex: question.correctIndex,
      explanation: question.explanation.trim(),
    })),
    source: value.source,
    ...(value.sourceNoteId === undefined ? {} : { sourceNoteId: value.sourceNoteId.trim() }),
    createdAt: value.createdAt,
  }
}

function parseAttempt(value: unknown): QuizAttempt | null {
  if (!isRecord(value) || !Array.isArray(value.answers) || !value.answers.every(isValidAnswer)) return null
  if (!Number.isFinite(value.score) || typeof value.score !== 'number' || value.score < 0 || value.score > 100) return null
  if (!Number.isInteger(value.correctCount) || typeof value.correctCount !== 'number' || value.correctCount < 0) return null
  if (!isNonEmptyString(value.quizId) || !isTimestamp(value.completedAt)) return null

  return {
    quizId: value.quizId.trim(),
    answers: [...value.answers],
    score: value.score,
    correctCount: value.correctCount,
    completedAt: value.completedAt,
  }
}

export function sanitizeQuizState(input: unknown): QuizState {
  const defaults = createInitialQuizState()
  if (!isRecord(input)) return defaults
  const candidate = isRecord(input.state) ? input.state : input
  const quizzes = Array.isArray(candidate.quizzes)
    ? candidate.quizzes.map(parseQuiz).filter((quiz): quiz is Quiz => quiz !== null)
    : defaults.quizzes
  const attempts = Array.isArray(candidate.attempts)
    ? candidate.attempts.map(parseAttempt).filter((attempt): attempt is QuizAttempt => attempt !== null)
    : defaults.attempts

  return { quizzes, attempts }
}

export function validateManualQuizInput(input: unknown): string[] {
  const errors: string[] = []
  if (!isRecord(input)) return ['Quiz input must be an object.']
  if (!isNonEmptyString(input.title)) errors.push('A title is required.')
  if (!isNonEmptyString(input.subject)) errors.push('A subject is required.')
  if (!isNonEmptyString(input.difficulty)) errors.push('A difficulty is required.')
  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    errors.push('At least one question is required.')
    return errors
  }

  input.questions.forEach((question, index) => {
    if (!isRecord(question)) {
      errors.push(`Question ${index + 1} must be an object.`)
      return
    }
    if (!isNonEmptyString(question.prompt)) errors.push(`Question ${index + 1} needs a prompt.`)
    if (!isNonEmptyString(question.explanation)) errors.push(`Question ${index + 1} needs an explanation.`)
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push(`Question ${index + 1} must have exactly four options.`)
    } else {
      if (!question.options.every(isNonEmptyString)) errors.push(`Question ${index + 1} options cannot be empty.`)
      if (new Set(question.options.map((option) => typeof option === 'string' ? option.trim().toLocaleLowerCase() : option)).size !== 4) {
        errors.push(`Question ${index + 1} options must be unique.`)
      }
    }
    if (typeof question.correctIndex !== 'number' || !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      errors.push(`Question ${index + 1} needs a correct option index from 0 to 3.`)
    }
  })

  return errors
}

function makeId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

export function createManualQuiz(input: ManualQuizInput, createdAt = nowIso(), id = makeId('quiz')): Quiz | null {
  if (validateManualQuizInput(input).length > 0 || !isTimestamp(createdAt)) return null

  return {
    id,
    title: input.title.trim(),
    subject: input.subject.trim(),
    difficulty: input.difficulty.trim(),
    questions: input.questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()) as QuizQuestion['options'],
      correctIndex: question.correctIndex,
      explanation: question.explanation.trim(),
    })),
    source: 'manual',
    createdAt,
  }
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function deterministicShuffle(values: string[], seed: string): string[] {
  const result = [...values]
  let state = stableHash(seed) || 1
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = Math.imul(state ^ (state >>> 13), 0x5bd1e995) >>> 0
    const swapIndex = state % (index + 1)
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }
  return result
}

function makeOptions(correct: string, distractors: string[], seed: string): QuizQuestion['options'] {
  const seen = new Set<string>()
  const values = [correct, ...distractors]
    .map((option) => option.trim())
    .filter((option) => {
      const key = option.toLocaleLowerCase()
      if (!option || seen.has(key)) return false
      seen.add(key)
      return true
    })
  let fallbackIndex = 1
  while (values.length < 4) {
    const fallback = `Review choice ${fallbackIndex}`
    fallbackIndex += 1
    if (!seen.has(fallback.toLocaleLowerCase())) {
      seen.add(fallback.toLocaleLowerCase())
      values.push(fallback)
    }
  }
  return deterministicShuffle(values.slice(0, 4), seed) as QuizQuestion['options']
}

function firstSentence(content: string): string {
  const normalized = content.trim().replace(/\s+/g, ' ')
  if (!normalized) return 'No content was provided.'
  const sentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? normalized
  return sentence.length > 140 ? `${sentence.slice(0, 137).trimEnd()}...` : sentence
}

function isUsableNote(note: Note): boolean {
  return isNonEmptyString(note.id) && isNonEmptyString(note.title) && isNonEmptyString(note.subject) && isNonEmptyString(note.topic) && typeof note.content === 'string'
}

export function generateQuizFromNote(note: Note, createdAt = note.updatedAt): Quiz | null {
  if (!isUsableNote(note) || !isTimestamp(createdAt)) return null
  const title = note.title.trim()
  const subject = note.subject.trim()
  const topic = note.topic.trim()
  const content = firstSentence(note.content)
  const seed = `${note.id}|${title}|${subject}|${topic}|${note.content}`
  const makeQuestion = (prompt: string, answer: string, distractors: string[], field: string): QuizQuestion => {
    const options = makeOptions(answer, distractors, `${seed}|${field}`)
    return {
      prompt,
      options,
      correctIndex: options.findIndex((option) => option === answer),
      explanation: `The answer is taken directly from the note's ${field}. ${LOCAL_QUIZ_GENERATION_NOTICE}`,
    }
  }

  return {
    id: `quiz-notes-${note.id}`,
    title: `${title} · Quick quiz`,
    subject,
    difficulty: 'easy',
    questions: [
      makeQuestion(`What topic is covered by “${title}”?`, topic, [subject, title, 'General review'], 'topic'),
      makeQuestion('Which subject is associated with this note?', subject, [topic, title, 'General study'], 'subject'),
      makeQuestion('What is the title of the saved note?', title, [topic, subject, 'Untitled source'], 'title'),
      makeQuestion('Which statement best represents the note content?', content, ['The note has no supporting details.', 'A separate topic is being reviewed.', 'The source contains only a question.'], 'content'),
    ],
    source: 'notes',
    sourceNoteId: note.id,
    createdAt,
  }
}

export const createQuizFromNote = generateQuizFromNote

export type QuizScore = {
  score: number
  correctCount: number
}

export function calculateQuizScore(quiz: Pick<Quiz, 'questions'>, answers: readonly number[]): QuizScore {
  const correctCount = quiz.questions.reduce((total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0), 0)
  return {
    correctCount,
    score: quiz.questions.length === 0 ? 0 : Math.round((correctCount / quiz.questions.length) * 100),
  }
}

export const calculateScore = calculateQuizScore

export function createRetryAnswers(quiz: Pick<Quiz, 'questions'>): QuizAnswers {
  return quiz.questions.map(() => -1)
}

export const retryAnswers = createRetryAnswers

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      ...createInitialQuizState(),
      createManualQuiz: (input) => {
        const quiz = createManualQuiz(input)
        if (!quiz) return ''
        set((state) => ({ quizzes: [...state.quizzes, quiz] }))
        return quiz.id
      },
      createQuizFromNote: (note) => {
        const quiz = generateQuizFromNote(note, nowIso())
        if (!quiz) return ''
        set((state) => ({
          quizzes: state.quizzes.some((item) => item.id === quiz.id)
            ? state.quizzes.map((item) => item.id === quiz.id ? quiz : item)
            : [...state.quizzes, quiz],
        }))
        return quiz.id
      },
      saveAttempt: (quizId, answers, completedAt = nowIso()) => {
        const quiz = get().quizzes.find((item) => item.id === quizId)
        if (!quiz || answers.length !== quiz.questions.length || !answers.every(isValidAnswer) || !isTimestamp(completedAt)) return null
        const result = calculateQuizScore(quiz, answers)
        const attempt: QuizAttempt = {
          quizId,
          answers: [...answers],
          ...result,
          completedAt,
        }
        set((state) => ({ attempts: [...state.attempts, attempt] }))
        return attempt
      },
      retryQuiz: (quizId) => {
        const quiz = get().quizzes.find((item) => item.id === quizId)
        return quiz ? createRetryAnswers(quiz) : []
      },
    }),
    {
      name: QUIZ_STORAGE_KEY,
      storage: safeStorage,
      partialize: (state) => ({ quizzes: state.quizzes, attempts: state.attempts }),
      merge: (persisted, current) => ({ ...current, ...sanitizeQuizState(persisted) }),
    },
  ),
)
