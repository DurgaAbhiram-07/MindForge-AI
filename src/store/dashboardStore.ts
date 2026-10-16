import { create } from 'zustand'
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware'

export type ActivityColor = 'violet' | 'cyan' | 'amber'

export type DashboardTask = {
  id: string
  title: string
  category: string
  durationMinutes: number
  completed: boolean
}

export type DashboardActivity = {
  id: string
  subject: string
  title: string
  detail: string
  color: ActivityColor
}

export type DashboardState = {
  tasks: DashboardTask[]
  activity: DashboardActivity[]
  studyMinutes: number
  currentStreak: number
  quizAccuracy: number
  dailyGoalMinutes: number
  activePage: string
  isDemoData: boolean
}

export type DashboardActions = {
  toggleTask: (taskId: string) => void
  setActivePage: (page: string) => void
  clearActivity: () => void
  restoreDemoActivity: () => void
}

export type DashboardStore = DashboardState & DashboardActions

const initialTasks: DashboardTask[] = [
  { id: 'biology-review', title: 'Review cellular respiration', category: 'Biology', durationMinutes: 25, completed: true },
  { id: 'math-practice', title: 'Practice quadratic equations', category: 'Mathematics', durationMinutes: 20, completed: false },
  { id: 'history-reading', title: 'Read World War II summary', category: 'History', durationMinutes: 15, completed: false },
]

const initialActivity: DashboardActivity[] = [
  { id: 'biology-quiz', subject: 'Biology', title: 'Cellular respiration quiz', detail: '18 questions · 92% score', color: 'violet' },
  { id: 'math-notes', subject: 'Mathematics', title: 'Quadratic equations notes', detail: '12 min read · 3 highlights', color: 'cyan' },
  { id: 'history-cards', subject: 'History', title: 'World War II flashcards', detail: '24 cards reviewed', color: 'amber' },
]

export function createInitialDashboardState(): DashboardState {
  return {
    tasks: initialTasks.map((task) => ({ ...task })),
    activity: initialActivity.map((item) => ({ ...item })),
    studyMinutes: 504,
    currentStreak: 12,
    quizAccuracy: 92,
    dailyGoalMinutes: 60,
    activePage: 'Dashboard',
    isDemoData: true,
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
    const probeKey = '__mindforge_storage_probe__'
    storage.setItem(probeKey, 'ok')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return fallbackStorage
  }
}

const safeStorage = createJSONStorage(() => getSafeStorage())

function isActivityColor(value: unknown): value is ActivityColor {
  return value === 'violet' || value === 'cyan' || value === 'amber'
}

function sanitizeState(input: unknown): DashboardState {
  const defaults = createInitialDashboardState()
  if (!input || typeof input !== 'object') return defaults

  const candidate = input as Partial<DashboardState>
  const tasks = Array.isArray(candidate.tasks)
    ? candidate.tasks.filter((task): task is DashboardTask => Boolean(
      task && typeof task === 'object' &&
      typeof task.id === 'string' && typeof task.title === 'string' &&
      typeof task.category === 'string' && Number.isFinite(task.durationMinutes) &&
      typeof task.completed === 'boolean',
    )).map((task) => ({ ...task, durationMinutes: Math.max(0, task.durationMinutes) }))
    : defaults.tasks
  const activity = Array.isArray(candidate.activity)
    ? candidate.activity.filter((item): item is DashboardActivity => Boolean(
      item && typeof item === 'object' && typeof item.id === 'string' &&
      typeof item.subject === 'string' && typeof item.title === 'string' &&
      typeof item.detail === 'string' && isActivityColor(item.color),
    ))
    : defaults.activity

  return {
    tasks: tasks.length ? tasks : defaults.tasks,
    activity,
    studyMinutes: typeof candidate.studyMinutes === 'number' && Number.isFinite(candidate.studyMinutes) ? Math.max(0, candidate.studyMinutes) : defaults.studyMinutes,
    currentStreak: typeof candidate.currentStreak === 'number' && Number.isFinite(candidate.currentStreak) ? Math.max(0, Math.floor(candidate.currentStreak)) : defaults.currentStreak,
    quizAccuracy: typeof candidate.quizAccuracy === 'number' && Number.isFinite(candidate.quizAccuracy) ? Math.min(100, Math.max(0, candidate.quizAccuracy)) : defaults.quizAccuracy,
    dailyGoalMinutes: typeof candidate.dailyGoalMinutes === 'number' && Number.isFinite(candidate.dailyGoalMinutes) ? Math.max(1, candidate.dailyGoalMinutes) : defaults.dailyGoalMinutes,
    activePage: typeof candidate.activePage === 'string' && candidate.activePage ? candidate.activePage : defaults.activePage,
    isDemoData: true,
  }
}

export const useDashboardStore = create<DashboardStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...createInitialDashboardState(),
        toggleTask: (taskId) => set((state) => {
          const task = state.tasks.find((item) => item.id === taskId)
          if (!task) return state
          const completed = !task.completed
          return {
            tasks: state.tasks.map((item) => item.id === taskId ? { ...item, completed } : item),
            studyMinutes: Math.max(0, state.studyMinutes + (completed ? task.durationMinutes : -task.durationMinutes)),
          }
        }),
        setActivePage: (activePage) => set({ activePage }),
        clearActivity: () => set({ activity: [] }),
        restoreDemoActivity: () => set({ activity: initialActivity.map((item) => ({ ...item })) }),
      }),
      {
        name: 'mindforge-dashboard',
        storage: safeStorage,
        partialize: (state) => ({
          tasks: state.tasks,
          activity: state.activity,
          studyMinutes: state.studyMinutes,
          currentStreak: state.currentStreak,
          quizAccuracy: state.quizAccuracy,
          dailyGoalMinutes: state.dailyGoalMinutes,
          activePage: state.activePage,
          isDemoData: state.isDemoData,
        }),
        merge: (persisted, current) => ({ ...current, ...sanitizeState(persisted) }),
      },
    ),
  ),
)
