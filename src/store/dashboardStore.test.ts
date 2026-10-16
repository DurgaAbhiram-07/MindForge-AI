import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialDashboardState, useDashboardStore } from './dashboardStore'

describe('dashboard persistence and progress', () => {
  beforeEach(() => {
    localStorage.clear()
    useDashboardStore.setState(createInitialDashboardState())
  })

  it('updates completed tasks and study time immediately', () => {
    const task = useDashboardStore.getState().tasks[0]
    const initialMinutes = useDashboardStore.getState().studyMinutes

    useDashboardStore.getState().toggleTask(task.id)

    expect(useDashboardStore.getState().tasks[0].completed).toBe(!task.completed)
    expect(useDashboardStore.getState().studyMinutes).toBe(
      initialMinutes + (task.completed ? -task.durationMinutes : task.durationMinutes),
    )
  })

  it('ignores malformed persisted data and keeps safe defaults', () => {
    localStorage.setItem('mindforge-dashboard', '{not-json')
    useDashboardStore.persist.rehydrate()

    expect(useDashboardStore.getState().tasks.length).toBeGreaterThan(0)
    expect(useDashboardStore.getState().studyMinutes).toBe(504)
  })
})
