import { describe, expect, it } from 'vitest'
import {
  addDays,
  calculateDailyGoal,
  calculateStreak,
  getDaysBetween,
  parseDateKey,
  toLocalDateKey,
} from './streakCalculations'

describe('streakCalculations', () => {
  describe('toLocalDateKey and date helpers', () => {
    it('formats date to YYYY-MM-DD correctly', () => {
      const d = new Date(2026, 9, 17) // Oct 17 2026
      expect(toLocalDateKey(d)).toBe('2026-10-17')
    })

    it('returns empty string for invalid dates', () => {
      expect(toLocalDateKey('')).toBe('')
      expect(toLocalDateKey('invalid-date')).toBe('')
    })

    it('parses valid date keys', () => {
      expect(parseDateKey('2026-10-17')).toEqual({ year: 2026, month: 10, day: 17 })
      expect(parseDateKey('2026-02-29')).toBeNull() // 2026 is not a leap year
      expect(parseDateKey('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 }) // 2024 is leap year
      expect(parseDateKey('invalid')).toBeNull()
    })

    it('correctly adds and subtracts days across months and years', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
      expect(addDays('2026-02-01', -1)).toBe('2026-01-31')
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
      expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
      expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // Leap year
    })

    it('calculates calendar days between dates', () => {
      expect(getDaysBetween('2026-10-10', '2026-10-15')).toBe(5)
      expect(getDaysBetween('2026-10-15', '2026-10-10')).toBe(-5)
      expect(getDaysBetween('2026-01-30', '2026-02-02')).toBe(3)
    })
  })

  describe('calculateStreak', () => {
    const today = '2026-10-17'

    it('returns 0 streak for empty dates', () => {
      const res = calculateStreak([], today)
      expect(res.currentStreak).toBe(0)
      expect(res.longestStreak).toBe(0)
      expect(res.activeToday).toBe(false)
      expect(res.activeYesterday).toBe(false)
      expect(res.totalActiveDays).toBe(0)
    })

    it('returns 1 day streak when active today only', () => {
      const res = calculateStreak(['2026-10-17'], today)
      expect(res.currentStreak).toBe(1)
      expect(res.longestStreak).toBe(1)
      expect(res.activeToday).toBe(true)
      expect(res.activeYesterday).toBe(false)
      expect(res.totalActiveDays).toBe(1)
    })

    it('maintains streak if active yesterday but not yet today', () => {
      const res = calculateStreak(['2026-10-15', '2026-10-16'], today)
      expect(res.currentStreak).toBe(2)
      expect(res.longestStreak).toBe(2)
      expect(res.activeToday).toBe(false)
      expect(res.activeYesterday).toBe(true)
    })

    it('resets current streak to 0 if yesterday was missed, preserving longest streak', () => {
      const res = calculateStreak(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'], today)
      expect(res.currentStreak).toBe(0)
      expect(res.longestStreak).toBe(4)
      expect(res.activeToday).toBe(false)
      expect(res.activeYesterday).toBe(false)
      expect(res.totalActiveDays).toBe(4)
    })

    it('calculates multi-day streak active up to today', () => {
      const dates = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']
      const res = calculateStreak(dates, today)
      expect(res.currentStreak).toBe(4)
      expect(res.longestStreak).toBe(4)
      expect(res.activeToday).toBe(true)
    })

    it('correctly finds longest streak when older run was longer than current', () => {
      // 5-day streak in September, then break, then 2-day streak up to today
      const dates = [
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-10-16',
        '2026-10-17',
      ]
      const res = calculateStreak(dates, today)
      expect(res.currentStreak).toBe(2)
      expect(res.longestStreak).toBe(5)
      expect(res.totalActiveDays).toBe(7)
    })

    it('handles duplicate dates and unsorted input gracefully', () => {
      const dates = ['2026-10-17', '2026-10-16', '2026-10-17', '2026-10-15', '2026-10-16']
      const res = calculateStreak(dates, today)
      expect(res.currentStreak).toBe(3)
      expect(res.longestStreak).toBe(3)
      expect(res.totalActiveDays).toBe(3)
    })

    it('handles month transitions in streaks', () => {
      const dates = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']
      const res = calculateStreak(dates, '2026-10-02')
      expect(res.currentStreak).toBe(4)
      expect(res.longestStreak).toBe(4)
    })
  })

  describe('calculateDailyGoal', () => {
    it('calculates daily goal progress correctly', () => {
      const res = calculateDailyGoal(30, 60)
      expect(res.completedMinutes).toBe(30)
      expect(res.dailyGoalMinutes).toBe(60)
      expect(res.percent).toBe(50)
      expect(res.isGoalMet).toBe(false)
      expect(res.remainingMinutes).toBe(30)
    })

    it('marks goal met when completed meets or exceeds goal', () => {
      const res = calculateDailyGoal(75, 60)
      expect(res.percent).toBe(100)
      expect(res.isGoalMet).toBe(true)
      expect(res.remainingMinutes).toBe(0)
    })

    it('handles 0 completed minutes without crashing', () => {
      const res = calculateDailyGoal(0, 60)
      expect(res.percent).toBe(0)
      expect(res.isGoalMet).toBe(false)
      expect(res.remainingMinutes).toBe(60)
    })
  })
})
