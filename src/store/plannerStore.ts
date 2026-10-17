import { create } from 'zustand'
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware'

export type PlannerPriority = 'low' | 'medium' | 'high'

export type PlannerTask = {
  id: string
  title: string
  subject: string
  topic: string
  date: string
  startTime?: string
  durationMinutes: number
  priority: PlannerPriority
  completed: boolean
  linkedNoteId?: string
  linkedQuizId?: string
}

export type PlannerTaskInput = Omit<PlannerTask, 'id'>
export type PlannerTaskUpdates = Partial<PlannerTaskInput>

export type PlannerPreferences = {
  dailyGoalMinutes: number
}

export type PlannerState = {
  tasks: PlannerTask[]
  preferences: PlannerPreferences
}

export type PlannerActions = {
  createTask: (input: PlannerTaskInput) => string
  addTask: (input: PlannerTaskInput) => string
  updateTask: (taskId: string, updates: PlannerTaskUpdates) => void
  editTask: (taskId: string, updates: PlannerTaskUpdates) => void
  completeTask: (taskId: string, completed?: boolean) => void
  setTaskCompleted: (taskId: string, completed?: boolean) => void
  toggleTaskCompleted: (taskId: string) => void
  deleteTask: (taskId: string) => void
  setPreferences: (updates: Partial<PlannerPreferences>) => void
  setDailyGoalMinutes: (minutes: number) => void
}

export type PlannerStore = PlannerState & PlannerActions

export const PLANNER_STORAGE_KEY = 'mindforge-planner'
export const DEFAULT_DAILY_GOAL_MINUTES = 60
export const MAX_TASK_DURATION_MINUTES = 24 * 60

export type PlannerDateView = 'today' | 'upcoming' | 'completed'

export type PlannerPriorityOptions = {
  today?: string
  weakTopicKeys?: readonly string[]
  now?: Date
}

export type PlannerConflict = {
  taskIds: [string, string]
  taskAId: string
  taskBId: string
  date: string
  overlapStart: string
  overlapEnd: string
}

export type PrioritizedTask = {
  task: PlannerTask
  reasons: string[]
}

export function createInitialPlannerState(): PlannerState {
  return {
    tasks: [],
    preferences: { dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES },
  }
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
    const probeKey = '__mindforge_planner_storage_probe__'
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isTimeKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false
  const [hours, minutes] = value.split(':').map(Number)
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60
}

export function getTodayDate(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isPriority(value: unknown): value is PlannerPriority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function normalizeOptionalId(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined
}

function parseTask(value: unknown): PlannerTask | null {
  if (!isRecord(value)) return null
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.title) || !isNonEmptyString(value.subject) || !isNonEmptyString(value.topic)) return null
  if (!isDateKey(value.date) || !isPriority(value.priority) || typeof value.completed !== 'boolean') return null
  if (typeof value.durationMinutes !== 'number' || !Number.isInteger(value.durationMinutes) || value.durationMinutes < 1 || value.durationMinutes > MAX_TASK_DURATION_MINUTES) return null
  if (value.startTime !== undefined && !isTimeKey(value.startTime)) return null
  if (value.linkedNoteId !== undefined && !isNonEmptyString(value.linkedNoteId)) return null
  if (value.linkedQuizId !== undefined && !isNonEmptyString(value.linkedQuizId)) return null

  return {
    id: value.id.trim(),
    title: value.title.trim(),
    subject: value.subject.trim(),
    topic: value.topic.trim(),
    date: value.date,
    ...(value.startTime === undefined ? {} : { startTime: value.startTime }),
    durationMinutes: value.durationMinutes,
    priority: value.priority,
    completed: value.completed,
    ...(value.linkedNoteId === undefined ? {} : { linkedNoteId: value.linkedNoteId.trim() }),
    ...(value.linkedQuizId === undefined ? {} : { linkedQuizId: value.linkedQuizId.trim() }),
  }
}

function sanitizePreferences(value: unknown): PlannerPreferences {
  if (!isRecord(value)) return { dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES }
  return {
    dailyGoalMinutes: typeof value.dailyGoalMinutes === 'number' && Number.isInteger(value.dailyGoalMinutes)
      ? Math.min(MAX_TASK_DURATION_MINUTES, Math.max(1, value.dailyGoalMinutes))
      : DEFAULT_DAILY_GOAL_MINUTES,
  }
}

export function sanitizePlannerState(input: unknown): PlannerState {
  const defaults = createInitialPlannerState()
  if (!isRecord(input)) return defaults
  const candidate = isRecord(input.state) ? input.state : input
  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks.map(parseTask).filter((task): task is PlannerTask => task !== null)
    : defaults.tasks

  return {
    tasks,
    preferences: sanitizePreferences(candidate.preferences),
  }
}

function normalizeTaskInput(input: PlannerTaskInput): PlannerTaskInput | null {
  if (!isRecord(input)) return null
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const subject = typeof input.subject === 'string' ? input.subject.trim() : ''
  const topic = typeof input.topic === 'string' ? input.topic.trim() : ''
  if (!title || !subject || !topic || !isDateKey(input.date) || !isPriority(input.priority)) return null
  if (typeof input.durationMinutes !== 'number' || !Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > MAX_TASK_DURATION_MINUTES) return null
  if (input.startTime !== undefined && !isTimeKey(input.startTime)) return null
  if (typeof input.completed !== 'boolean') return null

  return {
    title,
    subject,
    topic,
    date: input.date,
    ...(input.startTime === undefined ? {} : { startTime: input.startTime }),
    durationMinutes: input.durationMinutes,
    priority: input.priority,
    completed: input.completed,
    ...(normalizeOptionalId(input.linkedNoteId) === undefined ? {} : { linkedNoteId: normalizeOptionalId(input.linkedNoteId) }),
    ...(normalizeOptionalId(input.linkedQuizId) === undefined ? {} : { linkedQuizId: normalizeOptionalId(input.linkedQuizId) }),
  }
}

function makeTaskId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return `task-${globalThis.crypto.randomUUID()}`
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(value: number): string {
  const hours = String(Math.floor(value / 60)).padStart(2, '0')
  const minutes = String(value % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function taskSortValue(task: PlannerTask): string {
  return `${task.date}|${task.startTime ?? '99:99'}|${task.id}`
}

export function getTasksForDate(tasks: readonly PlannerTask[], date: string): PlannerTask[] {
  if (!isDateKey(date)) return []
  return tasks.filter((task) => task.date === date)
}

export function getTodayTasks(tasks: readonly PlannerTask[], today = getTodayDate()): PlannerTask[] {
  return getTasksForDate(tasks, today).filter((task) => !task.completed).sort((left, right) => taskSortValue(left).localeCompare(taskSortValue(right)))
}

export function getUpcomingTasks(tasks: readonly PlannerTask[], today = getTodayDate()): PlannerTask[] {
  if (!isDateKey(today)) return []
  return tasks.filter((task) => !task.completed && task.date > today).sort((left, right) => taskSortValue(left).localeCompare(taskSortValue(right)))
}

export function getCompletedTasks(tasks: readonly PlannerTask[]): PlannerTask[] {
  return tasks.filter((task) => task.completed).sort((left, right) => taskSortValue(right).localeCompare(taskSortValue(left)))
}

export function getTasksForView(tasks: readonly PlannerTask[], view: PlannerDateView, today = getTodayDate()): PlannerTask[] {
  if (view === 'today') return getTodayTasks(tasks, today)
  if (view === 'upcoming') return getUpcomingTasks(tasks, today)
  return getCompletedTasks(tasks)
}

export const filterTasksByDateView = getTasksForView

function normalizedWeakTopicKeys(keys: readonly string[] | undefined): Set<string> {
  return new Set((keys ?? []).filter(isNonEmptyString).map((key) => key.trim().toLocaleLowerCase()))
}

function isWeakTopic(task: PlannerTask, weakTopicKeys: Set<string>): boolean {
  const topicKey = task.topic.trim().toLocaleLowerCase()
  const subjectTopicKey = `${task.subject.trim().toLocaleLowerCase()}::${topicKey}`
  return weakTopicKeys.has(topicKey) || weakTopicKeys.has(subjectTopicKey)
}

function isOverdue(task: PlannerTask, options: Required<Pick<PlannerPriorityOptions, 'today'>> & PlannerPriorityOptions): boolean {
  if (task.date < options.today) return true
  if (task.date !== options.today || !task.startTime || !options.now) return false
  return timeToMinutes(task.startTime) + task.durationMinutes <= options.now.getHours() * 60 + options.now.getMinutes()
}

export function getTaskPriorityReasons(task: PlannerTask, options: PlannerPriorityOptions = {}): string[] {
  const today = options.today ?? getTodayDate()
  const weakTopics = normalizedWeakTopicKeys(options.weakTopicKeys)
  const reasons: string[] = []
  if (isOverdue(task, { ...options, today })) reasons.push('overdue')
  if (task.priority === 'high') reasons.push('high-priority')
  if (isWeakTopic(task, weakTopics)) reasons.push('weak-topic')
  if (reasons.length === 0) reasons.push('standard')
  return reasons
}

export function prioritizeTasks(tasks: readonly PlannerTask[], options: PlannerPriorityOptions = {}): PlannerTask[] {
  const today = options.today ?? getTodayDate()
  const weakTopics = normalizedWeakTopicKeys(options.weakTopicKeys)
  return [...tasks].sort((left, right) => {
    const completedRank = Number(left.completed) - Number(right.completed)
    if (completedRank !== 0) return completedRank
    const overdueRank = Number(isOverdue(right, { ...options, today })) - Number(isOverdue(left, { ...options, today }))
    if (overdueRank !== 0) return overdueRank
    const priorityRank = ({ high: 0, medium: 1, low: 2 } satisfies Record<PlannerPriority, number>)
    const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority]
    if (priorityDifference !== 0) return priorityDifference
    const weakDifference = Number(isWeakTopic(right, weakTopics)) - Number(isWeakTopic(left, weakTopics))
    if (weakDifference !== 0) return weakDifference
    return taskSortValue(left).localeCompare(taskSortValue(right))
  })
}

export function getDailyAssistantPlan(tasks: readonly PlannerTask[], options: PlannerPriorityOptions = {}): PrioritizedTask[] {
  return prioritizeTasks(tasks.filter((task) => !task.completed), options).map((task) => ({
    task,
    reasons: getTaskPriorityReasons(task, options),
  }))
}

function compareTimedTasks(left: PlannerTask, right: PlannerTask): number {
  return left.date.localeCompare(right.date)
    || timeToMinutes(left.startTime as string) - timeToMinutes(right.startTime as string)
    || left.id.localeCompare(right.id)
}

export function findTaskConflicts(tasks: readonly PlannerTask[], date?: string): PlannerConflict[] {
  const timedTasks = tasks
    .filter((task) => !task.completed && task.startTime && (!date || task.date === date))
    .sort(compareTimedTasks)
  const conflicts: PlannerConflict[] = []

  for (let index = 0; index < timedTasks.length; index += 1) {
    const left = timedTasks[index]
    const leftStart = timeToMinutes(left.startTime as string)
    const leftEnd = leftStart + left.durationMinutes
    for (let nextIndex = index + 1; nextIndex < timedTasks.length; nextIndex += 1) {
      const right = timedTasks[nextIndex]
      if (right.date !== left.date) {
        if (right.date > left.date) break
        continue
      }
      const rightStart = timeToMinutes(right.startTime as string)
      if (rightStart >= leftEnd) break
      const rightEnd = rightStart + right.durationMinutes
      const overlapStart = Math.max(leftStart, rightStart)
      const overlapEnd = Math.min(leftEnd, rightEnd)
      if (overlapStart < overlapEnd) {
        conflicts.push({
          taskIds: [left.id, right.id],
          taskAId: left.id,
          taskBId: right.id,
          date: left.date,
          overlapStart: minutesToTime(overlapStart),
          overlapEnd: minutesToTime(overlapEnd),
        })
      }
    }
  }

  return conflicts
}

export const getTaskConflicts = findTaskConflicts
export const hasTaskConflicts = (tasks: readonly PlannerTask[], date?: string): boolean => findTaskConflicts(tasks, date).length > 0

export const usePlannerStore = create<PlannerStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => {
        const createTask = (input: PlannerTaskInput): string => {
          const normalized = normalizeTaskInput(input)
          if (!normalized) return ''
          const task: PlannerTask = { id: makeTaskId(), ...normalized }
          set((state) => ({ tasks: [...state.tasks, task] }))
          return task.id
        }

        const updateTask = (taskId: string, updates: PlannerTaskUpdates): void => {
          set((state) => {
            const current = state.tasks.find((task) => task.id === taskId)
            if (!current || !isRecord(updates)) return state
            const candidate = normalizeTaskInput({ ...current, ...updates })
            if (!candidate) return state
            return { tasks: state.tasks.map((task) => task.id === taskId ? { id: task.id, ...candidate } : task) }
          })
        }

        const completeTask = (taskId: string, completed = true): void => {
          set((state) => ({
            tasks: state.tasks.map((task) => task.id === taskId ? { ...task, completed } : task),
          }))
        }

        return {
          ...createInitialPlannerState(),
          createTask,
          addTask: createTask,
          updateTask,
          editTask: updateTask,
          completeTask,
          setTaskCompleted: completeTask,
          toggleTaskCompleted: (taskId) => {
            const task = get().tasks.find((item) => item.id === taskId)
            if (task) completeTask(taskId, !task.completed)
          },
          deleteTask: (taskId) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) })),
          setPreferences: (updates) => set((state) => ({ preferences: sanitizePreferences({ ...state.preferences, ...updates }) })),
          setDailyGoalMinutes: (minutes) => set((state) => ({ preferences: sanitizePreferences({ ...state.preferences, dailyGoalMinutes: minutes }) })),
        }
      },
      {
        name: PLANNER_STORAGE_KEY,
        storage: safeStorage,
        partialize: (state) => ({ tasks: state.tasks, preferences: state.preferences }),
        merge: (persisted, current) => ({ ...current, ...sanitizePlannerState(persisted) }),
      },
    ),
  ),
)
