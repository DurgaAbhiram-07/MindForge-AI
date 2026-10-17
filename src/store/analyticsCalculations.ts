import type { Note } from './notesStore'
import type { PlannerTask } from './plannerStore'
import type { Quiz, QuizAttempt } from './quizStore'
import type { XpTransaction, UnlockedAchievement } from './gamificationStore'
import { addDays, calculateStreak, getDaysBetween, getTodayDate, parseDateKey, toLocalDateKey } from './streakCalculations'

export type DateFilterRange = '7d' | '30d' | 'all'

export type QuizAccuracyPoint = {
  id: string
  dateKey: string
  displayDate: string
  timestamp: string
  score: number
  quizTitle: string
  subject: string
  correctCount: number
  questionCount: number
  movingAverage: number
}

export type DailyStudyPoint = {
  dateKey: string
  displayDate: string
  studyMinutes: number
  tasksCompleted: number
  quizzesCompleted: number
}

export type SubjectPerformance = {
  subject: string
  quizzesAttempted: number
  averageAccuracy: number | null
  studyMinutes: number
  notesCount: number
  status: 'Excelling' | 'Developing' | 'Needs Review' | 'No Quizzes'
}

export type ActivityItem = {
  id: string
  timestamp: string
  dateKey: string
  type: 'quiz' | 'task' | 'note' | 'achievement'
  title: string
  subject?: string
  detail: string
  badge?: string
  isDemo?: boolean
}

export type LearningAnalytics = {
  filter: DateFilterRange
  startDate: string | null
  endDate: string
  hasRealData: boolean
  totalQuizzesCompleted: number
  averageQuizAccuracy: number | null
  highQuizScore: number | null
  perfectQuizzesCount: number
  totalQuestionsAnswered: number
  totalCorrectQuestions: number
  totalStudyMinutes: number
  totalStudyHours: string
  averageDailyMinutes: number
  totalPlannedTasks: number
  completedTasksCount: number
  taskCompletionRate: number | null
  tasksByPriority: { high: number; medium: number; low: number }
  quizAccuracyOverTime: QuizAccuracyPoint[]
  dailyStudyTime: DailyStudyPoint[]
  subjectPerformance: SubjectPerformance[]
  activityHistory: ActivityItem[]
  currentStreak: number
  longestStreak: number
  activeToday: boolean
}

function formatShortDate(dateKey: string): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return dateKey
  const d = new Date(parsed.year, parsed.month - 1, parsed.day)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
}

export function getDateRangeBounds(filter: DateFilterRange, today = getTodayDate()): { startDate: string | null; endDate: string } {
  if (filter === '7d') {
    return { startDate: addDays(today, -6), endDate: today }
  }
  if (filter === '30d') {
    return { startDate: addDays(today, -29), endDate: today }
  }
  return { startDate: null, endDate: today }
}

export function isDateInRange(dateKey: string, startDate: string | null, endDate: string): boolean {
  if (!dateKey) return false
  if (startDate && dateKey < startDate) return false
  if (endDate && dateKey > endDate) return false
  return true
}

export function deriveLearningAnalytics(params: {
  quizzes: readonly Quiz[]
  attempts: readonly QuizAttempt[]
  plannerTasks: readonly PlannerTask[]
  notes: readonly Note[]
  transactions?: readonly XpTransaction[]
  unlockedAchievements?: readonly UnlockedAchievement[]
  filter?: DateFilterRange
  today?: string
}): LearningAnalytics {
  const {
    quizzes,
    attempts,
    plannerTasks,
    notes,
    unlockedAchievements = [],
    filter = '7d',
    today = getTodayDate(),
  } = params

  const { startDate, endDate } = getDateRangeBounds(filter, today)
  const quizById = new Map(quizzes.map((q) => [q.id, q]))

  // Determine if there is any real user activity recorded
  const hasRealData = attempts.length > 0 || plannerTasks.some((t) => t.completed) || notes.some((n) => !n.isDemoData)

  // 1. Filter Attempts within Date Range
  const sortedAttempts = [...attempts].sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  const filteredAttempts = sortedAttempts.filter((a) => {
    const dKey = toLocalDateKey(a.completedAt)
    return isDateInRange(dKey, startDate, endDate)
  })

  // 2. Quiz Accuracy Over Time & Aggregates
  let sumScore = 0
  let highScore: number | null = null
  let perfectQuizzesCount = 0
  let totalQuestionsAnswered = 0
  let totalCorrectQuestions = 0

  let runningSum = 0
  const quizAccuracyOverTime: QuizAccuracyPoint[] = filteredAttempts.map((attempt, index) => {
    const quiz = quizById.get(attempt.quizId)
    const dateKey = toLocalDateKey(attempt.completedAt)
    runningSum += attempt.score
    const movingAverage = Math.round(runningSum / (index + 1))

    sumScore += attempt.score
    if (highScore === null || attempt.score > highScore) {
      highScore = attempt.score
    }
    if (attempt.score === 100) {
      perfectQuizzesCount += 1
    }
    totalQuestionsAnswered += attempt.answers.length
    totalCorrectQuestions += attempt.correctCount

    return {
      id: `point-${attempt.quizId}-${attempt.completedAt}-${index}`,
      dateKey,
      displayDate: formatShortDate(dateKey),
      timestamp: attempt.completedAt,
      score: attempt.score,
      quizTitle: quiz?.title ?? 'Quiz attempt',
      subject: quiz?.subject ?? 'General',
      correctCount: attempt.correctCount,
      questionCount: attempt.answers.length,
      movingAverage,
    }
  })

  const totalQuizzesCompleted = filteredAttempts.length
  const averageQuizAccuracy = totalQuizzesCompleted > 0 ? Math.round(sumScore / totalQuizzesCompleted) : null

  // 3. Filter Planner Tasks & Task Completion
  const filteredTasks = plannerTasks.filter((t) => isDateInRange(t.date, startDate, endDate))
  const completedTasks = filteredTasks.filter((t) => t.completed)
  const totalPlannedTasks = filteredTasks.length
  const completedTasksCount = completedTasks.length
  const taskCompletionRate = totalPlannedTasks > 0 ? Math.round((completedTasksCount / totalPlannedTasks) * 100) : null

  const tasksByPriority = { high: 0, medium: 0, low: 0 }
  for (const t of completedTasks) {
    tasksByPriority[t.priority] += 1
  }

  // 4. Study Time (Aggregated from completed tasks)
  const totalStudyMinutes = completedTasks.reduce((acc, t) => acc + t.durationMinutes, 0)
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1)

  // Days in range for daily average
  const daysInRange = startDate ? Math.max(1, getDaysBetween(startDate, endDate) + 1) : 30
  const averageDailyMinutes = Math.round(totalStudyMinutes / daysInRange)

  // 5. Daily Study Time Breakdown (for charts)
  const dailyStudyMap = new Map<string, { studyMinutes: number; tasksCompleted: number; quizzesCompleted: number }>()

  // If using 7d or 30d, initialize all days in window to 0 so chart has continuous timeline
  if (startDate) {
    let curr = startDate
    while (curr <= endDate) {
      dailyStudyMap.set(curr, { studyMinutes: 0, tasksCompleted: 0, quizzesCompleted: 0 })
      curr = addDays(curr, 1)
    }
  }

  for (const task of completedTasks) {
    const entry = dailyStudyMap.get(task.date) ?? { studyMinutes: 0, tasksCompleted: 0, quizzesCompleted: 0 }
    entry.studyMinutes += task.durationMinutes
    entry.tasksCompleted += 1
    dailyStudyMap.set(task.date, entry)
  }

  for (const attempt of filteredAttempts) {
    const dKey = toLocalDateKey(attempt.completedAt)
    const entry = dailyStudyMap.get(dKey) ?? { studyMinutes: 0, tasksCompleted: 0, quizzesCompleted: 0 }
    entry.quizzesCompleted += 1
    dailyStudyMap.set(dKey, entry)
  }

  const dailyStudyTime: DailyStudyPoint[] = [...dailyStudyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, val]) => ({
      dateKey,
      displayDate: formatShortDate(dateKey),
      studyMinutes: val.studyMinutes,
      tasksCompleted: val.tasksCompleted,
      quizzesCompleted: val.quizzesCompleted,
    }))

  // 6. Subject-Wise Performance
  const subjectMap = new Map<
    string,
    { quizzesAttempted: number; totalScore: number; studyMinutes: number; notesCount: number }
  >()

  const ensureSubject = (sub: string) => {
    const clean = sub.trim()
    if (!clean) return 'General'
    if (!subjectMap.has(clean)) {
      subjectMap.set(clean, { quizzesAttempted: 0, totalScore: 0, studyMinutes: 0, notesCount: 0 })
    }
    return clean
  }

  // From Quizzes and attempts
  for (const attempt of filteredAttempts) {
    const quiz = quizById.get(attempt.quizId)
    const sub = ensureSubject(quiz?.subject ?? 'General')
    const entry = subjectMap.get(sub)!
    entry.quizzesAttempted += 1
    entry.totalScore += attempt.score
  }

  // From completed tasks
  for (const task of completedTasks) {
    const sub = ensureSubject(task.subject)
    const entry = subjectMap.get(sub)!
    entry.studyMinutes += task.durationMinutes
  }

  // From notes
  for (const note of notes) {
    const sub = ensureSubject(note.subject)
    const entry = subjectMap.get(sub)!
    entry.notesCount += 1
  }

  const subjectPerformance: SubjectPerformance[] = [...subjectMap.entries()].map(([subject, data]) => {
    const averageAccuracy = data.quizzesAttempted > 0 ? Math.round(data.totalScore / data.quizzesAttempted) : null

    let status: SubjectPerformance['status'] = 'No Quizzes'
    if (averageAccuracy !== null) {
      if (averageAccuracy >= 85) status = 'Excelling'
      else if (averageAccuracy >= 70) status = 'Developing'
      else status = 'Needs Review'
    }

    return {
      subject,
      quizzesAttempted: data.quizzesAttempted,
      averageAccuracy,
      studyMinutes: data.studyMinutes,
      notesCount: data.notesCount,
      status,
    }
  }).sort((a, b) => b.studyMinutes - a.studyMinutes || (b.averageAccuracy ?? 0) - (a.averageAccuracy ?? 0))

  // 7. Activity History (Unified chronological feed)
  const activityHistory: ActivityItem[] = []

  for (const attempt of filteredAttempts) {
    const quiz = quizById.get(attempt.quizId)
    const dateKey = toLocalDateKey(attempt.completedAt)
    activityHistory.push({
      id: `act-quiz-${attempt.quizId}-${attempt.completedAt}`,
      timestamp: attempt.completedAt,
      dateKey,
      type: 'quiz',
      title: `${quiz?.title ?? 'Quiz'} completed`,
      subject: quiz?.subject,
      detail: `${attempt.score}% score · ${attempt.correctCount}/${attempt.answers.length} correct`,
      badge: `${attempt.score}%`,
    })
  }

  for (const task of completedTasks) {
    activityHistory.push({
      id: `act-task-${task.id}`,
      timestamp: `${task.date}T12:00:00Z`,
      dateKey: task.date,
      type: 'task',
      title: `${task.title} completed`,
      subject: task.subject,
      detail: `${task.durationMinutes} min study session · ${task.topic}`,
      badge: `${task.durationMinutes}m`,
    })
  }

  for (const note of notes) {
    const dateKey = toLocalDateKey(note.createdAt)
    if (isDateInRange(dateKey, startDate, endDate)) {
      activityHistory.push({
        id: `act-note-${note.id}`,
        timestamp: note.createdAt,
        dateKey,
        type: 'note',
        title: `Note created: ${note.title}`,
        subject: note.subject,
        detail: `${note.topic} · study note added`,
        isDemo: note.isDemoData,
      })
    }
  }

  for (const ach of unlockedAchievements) {
    const dateKey = toLocalDateKey(ach.unlockedAt)
    if (isDateInRange(dateKey, startDate, endDate)) {
      activityHistory.push({
        id: `act-ach-${ach.id}-${ach.unlockedAt}`,
        timestamp: ach.unlockedAt,
        dateKey,
        type: 'achievement',
        title: 'Achievement Unlocked',
        detail: `Earned: ${ach.id.replace(/-/g, ' ')}`,
        badge: 'Unlocked',
      })
    }
  }

  activityHistory.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  // 8. Streak calculation across all real active dates
  const allActiveDates: string[] = [
    ...attempts.map((a) => toLocalDateKey(a.completedAt)),
    ...plannerTasks.filter((t) => t.completed).map((t) => t.date),
    ...notes.map((n) => toLocalDateKey(n.createdAt)),
  ]
  const streakRes = calculateStreak(allActiveDates, today)

  return {
    filter,
    startDate,
    endDate,
    hasRealData,
    totalQuizzesCompleted,
    averageQuizAccuracy,
    highQuizScore: highScore,
    perfectQuizzesCount,
    totalQuestionsAnswered,
    totalCorrectQuestions,
    totalStudyMinutes,
    totalStudyHours,
    averageDailyMinutes,
    totalPlannedTasks,
    completedTasksCount,
    taskCompletionRate,
    tasksByPriority,
    quizAccuracyOverTime,
    dailyStudyTime,
    subjectPerformance,
    activityHistory,
    currentStreak: streakRes.currentStreak,
    longestStreak: streakRes.longestStreak,
    activeToday: streakRes.activeToday,
  }
}
