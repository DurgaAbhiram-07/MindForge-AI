import type { Note } from './notesStore'
import type { Quiz, QuizAttempt } from './quizStore'

export const WEAKNESS_THRESHOLDS = {
  minimumQuestions: 3,
  weakBelowAccuracy: 70,
  developingBelowAccuracy: 85,
} as const

export type TopicStatus = 'not-enough-data' | 'weak' | 'developing' | 'strong'

export type TopicPerformance = {
  key: string
  subject: string
  topic: string
  attemptedQuestions: number
  correctQuestions: number
  accuracy: number | null
  status: TopicStatus
  recommendation: string
}

export type WeaknessRecommendation = {
  type: 'note' | 'quiz'
  id: string
  title: string
  detail: string
}

export type WeaknessAnalytics = {
  topics: TopicPerformance[]
  recommendations: Record<string, WeaknessRecommendation[]>
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

function getStatus(attemptedQuestions: number, accuracy: number | null): TopicStatus {
  if (accuracy === null || attemptedQuestions < WEAKNESS_THRESHOLDS.minimumQuestions) return 'not-enough-data'
  if (accuracy < WEAKNESS_THRESHOLDS.weakBelowAccuracy) return 'weak'
  if (accuracy < WEAKNESS_THRESHOLDS.developingBelowAccuracy) return 'developing'
  return 'strong'
}

function recommendationFor(status: TopicStatus): string {
  if (status === 'weak') return 'Review the linked material, then retake a focused quiz.'
  if (status === 'developing') return 'Keep practicing this topic until recall becomes consistent.'
  if (status === 'not-enough-data') return 'Complete at least three answered questions to unlock a signal.'
  return 'This topic is holding steady. Use spaced practice to maintain it.'
}

export function deriveWeaknessAnalytics(
  quizzes: readonly Quiz[],
  attempts: readonly QuizAttempt[],
  notes: readonly Note[] = [],
): WeaknessAnalytics {
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]))
  const buckets = new Map<string, { subject: string; topic: string; attemptedQuestions: number; correctQuestions: number }>()

  for (const attempt of attempts) {
    const quiz = quizById.get(attempt.quizId)
    if (!quiz) continue
    const key = `${normalize(quiz.subject)}::${normalize(quiz.topic)}`
    const bucket = buckets.get(key) ?? { subject: quiz.subject, topic: quiz.topic, attemptedQuestions: 0, correctQuestions: 0 }
    quiz.questions.forEach((question, index) => {
      const answer = attempt.answers[index]
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) return
      bucket.attemptedQuestions += 1
      if (answer === question.correctIndex) bucket.correctQuestions += 1
    })
    buckets.set(key, bucket)
  }

  const topics = [...buckets.entries()]
    .map(([key, bucket]) => {
      const accuracy = bucket.attemptedQuestions === 0 ? null : Math.round((bucket.correctQuestions / bucket.attemptedQuestions) * 100)
      const status = getStatus(bucket.attemptedQuestions, accuracy)
      return { key, subject: bucket.subject, topic: bucket.topic, attemptedQuestions: bucket.attemptedQuestions, correctQuestions: bucket.correctQuestions, accuracy, status, recommendation: recommendationFor(status) }
    })
    .sort((left, right) => (left.accuracy ?? -1) - (right.accuracy ?? -1) || left.topic.localeCompare(right.topic))

  const recommendations: Record<string, WeaknessRecommendation[]> = {}
  for (const topic of topics) {
    const topicKey = normalize(topic.topic)
    const subjectKey = normalize(topic.subject)
    const relatedNotes = notes
      .filter((note) => normalize(note.subject) === subjectKey && normalize(note.topic) === topicKey)
      .map((note) => ({ type: 'note' as const, id: note.id, title: note.title, detail: 'Study material' }))
    const relatedQuizzes = quizzes
      .filter((quiz) => normalize(quiz.subject) === subjectKey && normalize(quiz.topic) === topicKey)
      .map((quiz) => ({ type: 'quiz' as const, id: quiz.id, title: quiz.title, detail: `${quiz.questions.length} questions · ${quiz.difficulty}` }))
    recommendations[topic.key] = [...relatedNotes, ...relatedQuizzes]
  }

  return { topics, recommendations }
}
