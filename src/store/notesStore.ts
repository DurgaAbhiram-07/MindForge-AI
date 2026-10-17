import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Note = {
  id: string
  title: string
  subject: string
  topic: string
  content: string
  createdAt: string
  updatedAt: string
  isRead: boolean
  isDemoData: boolean
}

export type NoteDraft = Pick<Note, 'title' | 'subject' | 'topic' | 'content'>

export type NoteFilters = {
  subject?: string
  topic?: string
  unreadOnly?: boolean
}

export type NoteSortKey = 'createdAt' | 'updatedAt' | 'title'
export type NoteSortDirection = 'asc' | 'desc'

export type NotesState = {
  notes: Note[]
  isDemoData: boolean
}

export type NotesActions = {
  addNote: (draft: NoteDraft) => string
  updateNote: (noteId: string, updates: Partial<NoteDraft>) => void
  deleteNote: (noteId: string) => void
  markNoteRead: (noteId: string, isRead?: boolean) => void
}

export type NotesStore = NotesState & NotesActions

const demoNotes: Note[] = [
  {
    id: 'demo-biology-cellular-respiration',
    title: 'Cellular respiration overview',
    subject: 'Biology',
    topic: 'Cellular respiration',
    content: 'Glycolysis, the Krebs cycle, and the electron transport chain work together to release energy from glucose.',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
    isRead: true,
    isDemoData: true,
  },
  {
    id: 'demo-mathematics-quadratics',
    title: 'Quadratic equations study guide',
    subject: 'Mathematics',
    topic: 'Quadratic equations',
    content: 'Use factoring, completing the square, or the quadratic formula to solve ax² + bx + c = 0.',
    createdAt: '2026-01-16T10:30:00.000Z',
    updatedAt: '2026-01-16T10:30:00.000Z',
    isRead: false,
    isDemoData: true,
  },
  {
    id: 'demo-history-world-war-two',
    title: 'World War II key events',
    subject: 'History',
    topic: 'World War II',
    content: 'A concise timeline of the major turning points and alliances of World War II.',
    createdAt: '2026-01-17T14:00:00.000Z',
    updatedAt: '2026-01-17T14:00:00.000Z',
    isRead: false,
    isDemoData: true,
  },
]

export function createInitialNotesState(): NotesState {
  return {
    notes: demoNotes.map((note) => ({ ...note })),
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
    const probeKey = '__mindforge_notes_storage_probe__'
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

function parseNote(value: unknown): Note | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const subject = typeof value.subject === 'string' ? value.subject.trim() : ''
  const topic = typeof value.topic === 'string' ? value.topic.trim() : ''
  if (!id || !title || !subject || !topic || typeof value.content !== 'string') return null
  if (!isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt)) return null

  return {
    id,
    title,
    subject,
    topic,
    content: value.content,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    isRead: typeof value.isRead === 'boolean' ? value.isRead : false,
    isDemoData: typeof value.isDemoData === 'boolean' ? value.isDemoData : false,
  }
}

function sanitizeState(input: unknown): NotesState {
  const defaults = createInitialNotesState()
  if (!isRecord(input)) return defaults

  if (!Array.isArray(input.notes)) return defaults
  if (input.notes.length === 0) return { notes: [], isDemoData: false }

  const notes = input.notes.map(parseNote).filter((note): note is Note => note !== null)
  if (notes.length === 0) return defaults

  return {
    notes,
    isDemoData: typeof input.isDemoData === 'boolean'
      ? input.isDemoData
      : notes.every((note) => note.isDemoData),
  }
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return [...notes]

  return notes.filter((note) => [note.title, note.subject, note.topic, note.content]
    .some((field) => normalizeText(field).includes(normalizedQuery)))
}

export function filterNotes(notes: Note[], filters: NoteFilters = {}): Note[] {
  const subject = filters.subject ? normalizeText(filters.subject) : ''
  const topic = filters.topic ? normalizeText(filters.topic) : ''

  return notes.filter((note) => {
    const matchesSubject = !subject || normalizeText(note.subject) === subject
    const matchesTopic = !topic || normalizeText(note.topic) === topic
    const matchesReadState = !filters.unreadOnly || !note.isRead
    return matchesSubject && matchesTopic && matchesReadState
  })
}

export function sortNotes(
  notes: Note[],
  key: NoteSortKey = 'updatedAt',
  direction: NoteSortDirection = 'desc',
): Note[] {
  const multiplier = direction === 'asc' ? 1 : -1

  return [...notes].sort((left, right) => {
    const leftValue = left[key]
    const rightValue = right[key]
    const comparison = key === 'title'
      ? leftValue.localeCompare(rightValue)
      : leftValue.localeCompare(rightValue)

    return comparison === 0 ? left.id.localeCompare(right.id) : comparison * multiplier
  })
}

export function selectNotes(
  notes: Note[],
  options: NoteFilters & { query?: string; sortKey?: NoteSortKey; sortDirection?: NoteSortDirection } = {},
): Note[] {
  const searched = searchNotes(notes, options.query ?? '')
  const filtered = filterNotes(searched, options)
  return sortNotes(filtered, options.sortKey, options.sortDirection)
}

function makeNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nowAfter(previous: string | undefined): string {
  const current = Date.now()
  const previousTime = previous ? Date.parse(previous) : Number.NaN
  return new Date(Math.max(current, Number.isFinite(previousTime) ? previousTime + 1 : current)).toISOString()
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      ...createInitialNotesState(),
      addNote: (draft) => {
        const title = draft.title.trim()
        const subject = draft.subject.trim()
        const topic = draft.topic.trim()
        if (!title || !subject || !topic) return ''

        const createdAt = nowAfter(undefined)
        const note: Note = {
          id: makeNoteId(),
          title,
          subject,
          topic,
          content: draft.content,
          createdAt,
          updatedAt: createdAt,
          isRead: false,
          isDemoData: false,
        }

        set((state) => ({ notes: [...state.notes, note], isDemoData: false }))
        return note.id
      },
      updateNote: (noteId, updates) => set((state) => {
        const note = state.notes.find((item) => item.id === noteId)
        if (!note) return state

        const nextTitle = updates.title === undefined ? note.title : updates.title.trim()
        const nextSubject = updates.subject === undefined ? note.subject : updates.subject.trim()
        const nextTopic = updates.topic === undefined ? note.topic : updates.topic.trim()
        if (!nextTitle || !nextSubject || !nextTopic) return state

        return {
          notes: state.notes.map((item) => item.id === noteId ? {
            ...item,
            title: nextTitle,
            subject: nextSubject,
            topic: nextTopic,
            content: updates.content === undefined ? item.content : updates.content,
            updatedAt: nowAfter(item.updatedAt),
            isDemoData: false,
          } : item),
          isDemoData: false,
        }
      }),
      deleteNote: (noteId) => set((state) => {
        const notes = state.notes.filter((note) => note.id !== noteId)
        return notes.length === state.notes.length ? state : { notes, isDemoData: false }
      }),
      markNoteRead: (noteId, isRead = true) => set((state) => {
        const note = state.notes.find((item) => item.id === noteId)
        if (!note || note.isRead === isRead) return state

        return {
          notes: state.notes.map((item) => item.id === noteId ? {
            ...item,
            isRead,
            updatedAt: nowAfter(item.updatedAt),
            isDemoData: false,
          } : item),
          isDemoData: false,
        }
      }),
    }),
    {
      name: 'mindforge-notes',
      storage: safeStorage,
      partialize: (state) => ({
        notes: state.notes,
        isDemoData: state.isDemoData,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitizeState(persisted) }),
    },
  ),
)
