import { beforeEach, describe, expect, it } from 'vitest'
import {
  createInitialPlannerState,
  findTaskConflicts,
  getCompletedTasks,
  getDailyAssistantPlan,
  getTodayTasks,
  getUpcomingTasks,
  hasTaskConflicts,
  prioritizeTasks,
  usePlannerStore,
  type PlannerTask,
  type PlannerTaskInput,
} from './plannerStore'

const taskInput = (overrides: Partial<PlannerTaskInput> = {}): PlannerTaskInput => ({
  title: 'Review cell energy',
  subject: 'Biology',
  topic: 'Cell energy',
  date: '2026-02-10',
  durationMinutes: 30,
  priority: 'medium',
  completed: false,
  ...overrides,
})

const task = (id: string, overrides: Partial<PlannerTask> = {}): PlannerTask => ({
  id,
  ...taskInput(),
  ...overrides,
})

describe('planner store CRUD and preferences', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlannerStore.setState(createInitialPlannerState())
  })

  it('creates, edits, completes, toggles, and deletes tasks', () => {
    const store = usePlannerStore.getState()
    const taskId = store.createTask(taskInput({ title: '  Review  ', startTime: '09:00', linkedNoteId: 'note-1' }))

    expect(taskId).toBeTruthy()
    expect(usePlannerStore.getState().tasks[0]).toMatchObject({
      title: 'Review',
      startTime: '09:00',
      linkedNoteId: 'note-1',
    })

    usePlannerStore.getState().updateTask(taskId, { title: 'Review revised', priority: 'high' })
    expect(usePlannerStore.getState().tasks[0]).toMatchObject({ title: 'Review revised', priority: 'high' })

    usePlannerStore.getState().completeTask(taskId)
    expect(usePlannerStore.getState().tasks[0].completed).toBe(true)
    usePlannerStore.getState().toggleTaskCompleted(taskId)
    expect(usePlannerStore.getState().tasks[0].completed).toBe(false)

    usePlannerStore.getState().deleteTask(taskId)
    expect(usePlannerStore.getState().tasks).toEqual([])
  })

  it('rejects invalid task input and clamps the daily goal preference', () => {
    expect(usePlannerStore.getState().createTask(taskInput({ date: '2026-02-30' }))).toBe('')
    expect(usePlannerStore.getState().createTask(taskInput({ durationMinutes: 0 }))).toBe('')
    expect(usePlannerStore.getState().createTask(taskInput({ startTime: '25:00' }))).toBe('')

    usePlannerStore.getState().setDailyGoalMinutes(0)
    expect(usePlannerStore.getState().preferences.dailyGoalMinutes).toBe(1)
    usePlannerStore.getState().setDailyGoalMinutes(9999)
    expect(usePlannerStore.getState().preferences.dailyGoalMinutes).toBe(1440)
  })
})

describe('planner date views and assistant prioritization', () => {
  const tasks = [
    task('today-open', { date: '2026-02-10' }),
    task('today-complete', { date: '2026-02-10', completed: true }),
    task('future-open', { date: '2026-02-11' }),
    task('past-complete', { date: '2026-02-09', completed: true }),
  ]

  it('filters Today, Upcoming, and Completed without mutating input', () => {
    expect(getTodayTasks(tasks, '2026-02-10').map((item) => item.id)).toEqual(['today-open'])
    expect(getUpcomingTasks(tasks, '2026-02-10').map((item) => item.id)).toEqual(['future-open'])
    expect(getCompletedTasks(tasks).map((item) => item.id)).toEqual(['today-complete', 'past-complete'])
    expect(tasks).toHaveLength(4)
  })

  it('uses transparent overdue, priority, and weak-topic rules', () => {
    const candidates = [
      task('standard-future', { date: '2026-02-12', priority: 'low', topic: 'Other' }),
      task('weak-future', { date: '2026-02-12', priority: 'medium', topic: 'Geometry' }),
      task('high-future', { date: '2026-02-12', priority: 'high', topic: 'Other' }),
      task('overdue', { date: '2026-02-09', priority: 'low', topic: 'Other' }),
    ]
    const options = { today: '2026-02-10', weakTopicKeys: ['geometry'] }

    expect(prioritizeTasks(candidates, options).map((item) => item.id)).toEqual([
      'overdue',
      'high-future',
      'weak-future',
      'standard-future',
    ])
    expect(getDailyAssistantPlan(candidates, options).map((item) => item.reasons)).toEqual([
      ['overdue'],
      ['high-priority'],
      ['weak-topic'],
      ['standard'],
    ])
  })
})

describe('planner conflict detection and persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlannerStore.setState(createInitialPlannerState())
  })

  it('detects overlapping same-day timed tasks and ignores adjacent tasks', () => {
    const tasks = [
      task('first', { date: '2026-02-10', startTime: '09:00', durationMinutes: 60 }),
      task('overlap', { date: '2026-02-10', startTime: '09:30', durationMinutes: 30 }),
      task('adjacent', { date: '2026-02-10', startTime: '10:00', durationMinutes: 30 }),
      task('other-day', { date: '2026-02-11', startTime: '09:30', durationMinutes: 30 }),
      task('untimed', { date: '2026-02-10' }),
    ]

    expect(findTaskConflicts(tasks, '2026-02-10')).toEqual([{
      taskIds: ['first', 'overlap'],
      taskAId: 'first',
      taskBId: 'overlap',
      date: '2026-02-10',
      overlapStart: '09:30',
      overlapEnd: '10:00',
    }])
    expect(hasTaskConflicts(tasks, '2026-02-11')).toBe(false)
  })

  it('persists planner data under its own key', () => {
    const taskId = usePlannerStore.getState().createTask(taskInput({ linkedQuizId: 'quiz-1' }))
    const persisted = JSON.parse(localStorage.getItem('mindforge-planner') ?? '{}') as { state?: { tasks?: Array<{ id: string }> } }

    expect(persisted.state?.tasks?.some((item) => item.id === taskId)).toBe(true)
    expect(localStorage.getItem('mindforge-dashboard')).toBeNull()
  })

  it('drops malformed tasks and sanitizes persisted preferences safely', () => {
    localStorage.setItem('mindforge-planner', JSON.stringify({
      state: {
        tasks: [
          { ...task('valid'), title: '  Valid persisted task  ' },
          { id: 'bad', title: 'missing required fields' },
          { ...task('bad-date'), date: 'not-a-date' },
          { ...task('bad-duration'), durationMinutes: 0 },
        ],
        preferences: { dailyGoalMinutes: 9999 },
      },
      version: 0,
    }))
    usePlannerStore.persist.rehydrate()

    expect(usePlannerStore.getState().tasks).toHaveLength(1)
    expect(usePlannerStore.getState().tasks[0].title).toBe('Valid persisted task')
    expect(usePlannerStore.getState().preferences.dailyGoalMinutes).toBe(1440)

    usePlannerStore.setState(createInitialPlannerState())
    localStorage.setItem('mindforge-planner', '{not-json')
    usePlannerStore.persist.rehydrate()
    expect(usePlannerStore.getState().tasks).toEqual([])
    expect(usePlannerStore.getState().preferences.dailyGoalMinutes).toBe(60)
  })
})
