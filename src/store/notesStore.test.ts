import { beforeEach, describe, expect, it } from 'vitest'
import {
  createInitialNotesState,
  filterNotes,
  searchNotes,
  selectNotes,
  sortNotes,
  useNotesStore,
} from './notesStore'

describe('notes store', () => {
  beforeEach(() => {
    localStorage.clear()
    useNotesStore.setState(createInitialNotesState())
  })

  it('starts with deterministic demo notes that are explicitly marked', () => {
    const { notes, isDemoData } = useNotesStore.getState()

    expect(isDemoData).toBe(true)
    expect(notes.map((note) => note.id)).toEqual([
      'demo-biology-cellular-respiration',
      'demo-mathematics-quadratics',
      'demo-history-world-war-two',
      'demo-cs-graph-algorithms',
      'demo-cs-distributed-systems',
      'demo-neuroscience-memory',
      'demo-math-linear-algebra',
      'demo-physics-relativity',
    ])
    expect(notes.every((note) => note.isDemoData)).toBe(true)
  })

  it('adds, updates, marks read, and deletes a note', () => {
    const store = useNotesStore.getState()
    const noteId = store.addNote({
      title: 'Limits and continuity',
      subject: 'Mathematics',
      topic: 'Calculus',
      content: 'A limit describes the value a function approaches.',
    })

    expect(noteId).toBeTruthy()
    expect(useNotesStore.getState().isDemoData).toBe(false)
    expect(useNotesStore.getState().notes.find((note) => note.id === noteId)).toMatchObject({
      title: 'Limits and continuity',
      isRead: false,
      isDemoData: false,
    })

    useNotesStore.getState().updateNote(noteId, { title: 'Limits and continuity revised' })
    useNotesStore.getState().markNoteRead(noteId)
    expect(useNotesStore.getState().notes.find((note) => note.id === noteId)).toMatchObject({
      title: 'Limits and continuity revised',
      isRead: true,
    })

    useNotesStore.getState().deleteNote(noteId)
    expect(useNotesStore.getState().notes.some((note) => note.id === noteId)).toBe(false)
  })

  it('toggles favorite status on a note', () => {
    const store = useNotesStore.getState()
    const noteId = store.notes[0].id
    expect(store.notes[0].favorite).toBeFalsy()

    store.toggleFavorite(noteId)
    expect(useNotesStore.getState().notes.find((n) => n.id === noteId)?.favorite).toBe(true)

    store.toggleFavorite(noteId)
    expect(useNotesStore.getState().notes.find((n) => n.id === noteId)?.favorite).toBe(false)
  })

  it('persists notes under its own key', () => {
    const noteId = useNotesStore.getState().addNote({
      title: 'Persistence check',
      subject: 'Study skills',
      topic: 'Review',
      content: 'Save this note.',
    })

    const persisted = JSON.parse(localStorage.getItem('mindforge-notes') ?? '{}') as {
      state?: { notes?: Array<{ id: string }> }
    }

    expect(persisted.state?.notes?.some((note) => note.id === noteId)).toBe(true)
    expect(localStorage.getItem('mindforge-dashboard')).toBeNull()
  })

  it('falls back to safe demo data for malformed or invalid persisted data', () => {
    localStorage.setItem('mindforge-notes', '{not-json')
    useNotesStore.persist.rehydrate()
    expect(useNotesStore.getState().notes).toHaveLength(8)

    localStorage.setItem('mindforge-notes', JSON.stringify({
      state: { notes: [{ id: 'bad', title: 'missing timestamps' }] },
      version: 0,
    }))
    useNotesStore.persist.rehydrate()
    expect(useNotesStore.getState().notes.map((note) => note.id)).toEqual([
      'demo-biology-cellular-respiration',
      'demo-mathematics-quadratics',
      'demo-history-world-war-two',
      'demo-cs-graph-algorithms',
      'demo-cs-distributed-systems',
      'demo-neuroscience-memory',
      'demo-math-linear-algebra',
      'demo-physics-relativity',
    ])
  })
})

describe('note search, filter, and sort helpers', () => {
  const notes = createInitialNotesState().notes

  it('searches across title, subject, topic, and content without mutating input', () => {
    const result = searchNotes(notes, 'electron transport')

    expect(result.map((note) => note.id)).toEqual(['demo-biology-cellular-respiration'])
    expect(notes).toHaveLength(8)
    expect(searchNotes(notes, '')).not.toBe(notes)
  })

  it('filters by subject, topic, and unread state', () => {
    expect(filterNotes(notes, { subject: 'mathematics' }).map((note) => note.id)).toEqual([
      'demo-mathematics-quadratics',
      'demo-math-linear-algebra',
    ])
    expect(filterNotes(notes, { unreadOnly: true })).toHaveLength(7)
    expect(filterNotes(notes, { topic: 'world war ii', unreadOnly: true })).toHaveLength(1)
  })

  it('sorts without mutating input and composes all helpers', () => {
    const newest = sortNotes(notes, 'createdAt', 'desc')
    expect(newest[0].id).toBe('demo-physics-relativity')
    expect(newest[newest.length - 1].id).toBe('demo-biology-cellular-respiration')
    expect(notes[0].id).toBe('demo-biology-cellular-respiration')

    expect(selectNotes(notes, {
      query: 'study guide',
      unreadOnly: true,
      sortKey: 'title',
      sortDirection: 'asc',
    }).map((note) => note.id)).toEqual(['demo-mathematics-quadratics'])
  })
})
