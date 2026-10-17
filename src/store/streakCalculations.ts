export function toLocalDateKey(dateInput: string | Date | number): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDate(now = new Date()): string {
  return toLocalDateKey(now)
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } | null {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return { year, month, day }
}

export function addDays(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return ''
  const d = new Date(parsed.year, parsed.month - 1, parsed.day)
  d.setDate(d.getDate() + days)
  return toLocalDateKey(d)
}

export function getDaysBetween(startDateKey: string, endDateKey: string): number {
  const p1 = parseDateKey(startDateKey)
  const p2 = parseDateKey(endDateKey)
  if (!p1 || !p2) return 0
  const d1 = new Date(p1.year, p1.month - 1, p1.day)
  const d2 = new Date(p2.year, p2.month - 1, p2.day)
  const diffTime = d2.getTime() - d1.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export type StreakResult = {
  currentStreak: number
  longestStreak: number
  activeToday: boolean
  activeYesterday: boolean
  totalActiveDays: number
  activeDates: string[]
}

export function calculateStreak(rawActiveDates: readonly string[], today = getTodayDate()): StreakResult {
  const validDates = [...new Set(rawActiveDates.filter((d) => parseDateKey(d) !== null))].sort()
  const totalActiveDays = validDates.length

  if (totalActiveDays === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeToday: false,
      activeYesterday: false,
      totalActiveDays: 0,
      activeDates: [],
    }
  }

  // Calculate longest streak across history
  let longestStreak = 1
  let currentRun = 1

  for (let i = 1; i < validDates.length; i++) {
    const diff = getDaysBetween(validDates[i - 1], validDates[i])
    if (diff === 1) {
      currentRun += 1
      if (currentRun > longestStreak) {
        longestStreak = currentRun
      }
    } else if (diff > 1) {
      currentRun = 1
    }
  }

  // Calculate current streak relative to today
  const activeToday = validDates.includes(today)
  const yesterday = addDays(today, -1)
  const activeYesterday = validDates.includes(yesterday)

  let currentStreak = 0

  if (activeToday) {
    currentStreak = 1
    let checkDate = yesterday
    while (validDates.includes(checkDate)) {
      currentStreak += 1
      checkDate = addDays(checkDate, -1)
    }
  } else if (activeYesterday) {
    // Today not yet completed, but streak is active from yesterday
    currentStreak = 1
    let checkDate = addDays(yesterday, -1)
    while (validDates.includes(checkDate)) {
      currentStreak += 1
      checkDate = addDays(checkDate, -1)
    }
  } else {
    // Neither today nor yesterday had activity -> streak is broken
    currentStreak = 0
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  return {
    currentStreak,
    longestStreak,
    activeToday,
    activeYesterday,
    totalActiveDays,
    activeDates: validDates,
  }
}

export type DailyGoalResult = {
  completedMinutes: number
  dailyGoalMinutes: number
  percent: number
  isGoalMet: boolean
  remainingMinutes: number
}

export function calculateDailyGoal(completedMinutes: number, dailyGoalMinutes: number): DailyGoalResult {
  const safeCompleted = Math.max(0, Math.round(completedMinutes))
  const safeGoal = Math.max(1, Math.round(dailyGoalMinutes))
  const percent = Math.min(100, Math.round((safeCompleted / safeGoal) * 100))
  const isGoalMet = safeCompleted >= safeGoal
  const remainingMinutes = Math.max(0, safeGoal - safeCompleted)

  return {
    completedMinutes: safeCompleted,
    dailyGoalMinutes: safeGoal,
    percent,
    isGoalMet,
    remainingMinutes,
  }
}
