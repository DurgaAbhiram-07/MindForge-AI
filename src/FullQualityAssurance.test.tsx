import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createInitialDashboardState, useDashboardStore } from './store/dashboardStore'
import { createInitialGamificationState, useGamificationStore } from './store/gamificationStore'
import { createInitialNotesState, useNotesStore } from './store/notesStore'
import { createInitialPlannerState, getTodayDate, usePlannerStore } from './store/plannerStore'
import { createInitialQuizState, useQuizStore } from './store/quizStore'

beforeEach(() => {
  localStorage.clear()
  useDashboardStore.setState(createInitialDashboardState())
  usePlannerStore.setState(createInitialPlannerState())
  useNotesStore.setState(createInitialNotesState())
  useQuizStore.setState(createInitialQuizState())
  useGamificationStore.setState(createInitialGamificationState())
})

afterEach(() => cleanup())

describe('MindForge AI Phase 7 Final QA Suite', () => {
  it('navigates seamlessly across all 7 primary workspace views', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 1. Dashboard is initial view
    expect(screen.getByRole('heading', { name: /good morning, durga/i })).toBeInTheDocument()

    // 2. Study materials
    await user.click(screen.getByRole('button', { name: /study materials/i }))
    expect(screen.getByRole('heading', { name: 'Study materials' })).toBeInTheDocument()

    // 3. Quizzes
    await user.click(screen.getByRole('button', { name: /quizzes/i }))
    expect(screen.getByRole('heading', { name: 'Quizzes' })).toBeInTheDocument()

    // 4. Study planner
    await user.click(screen.getByRole('button', { name: /study planner/i }))
    expect(screen.getByRole('heading', { name: 'Study planner' })).toBeInTheDocument()

    // 5. Analytics
    await user.click(screen.getByRole('button', { name: /analytics/i }))
    expect(screen.getByRole('heading', { name: 'Learning Analytics' })).toBeInTheDocument()

    // 6. Achievements
    await user.click(screen.getByRole('button', { name: /achievements/i }))
    expect(screen.getByRole('heading', { name: 'Achievements & XP' })).toBeInTheDocument()

    // 7. Progress (Weak Topics)
    await user.click(screen.getByRole('button', { name: /progress/i }))
    expect(screen.getByRole('heading', { name: 'Weak Topics' })).toBeInTheDocument()
  }, 15000)

  it('validates mobile navigation drawer toggle', async () => {
    const user = userEvent.setup()
    render(<App />)

    const openMenuBtn = screen.getByRole('button', { name: /open navigation/i })
    expect(openMenuBtn).toBeInTheDocument()

    // Open mobile sidebar
    await user.click(openMenuBtn)
    const closeMenuBtn = screen.getByRole('button', { name: 'Close navigation' })
    expect(closeMenuBtn).toBeInTheDocument()

    // Close mobile sidebar
    await user.click(closeMenuBtn)
  })

  it('performs complete Note lifecycle: read, search, filter, and delete', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /study materials/i }))

    // 1. Read note
    const noteCard = screen.getByText('Cellular respiration overview')
    await user.click(noteCard)
    expect(screen.getByRole('heading', { name: 'Cellular respiration overview' })).toBeInTheDocument()

    // Back to materials
    await user.click(screen.getByRole('button', { name: /back to materials/i }))
    expect(screen.getByRole('heading', { name: 'Study materials' })).toBeInTheDocument()

    // 2. Search note with fireEvent for fast input
    const searchInput = screen.getByPlaceholderText(/search notes, subjects, topics/i)
    fireEvent.change(searchInput, { target: { value: 'Quadratic' } })
    expect(screen.getByText('Quadratic equations study guide')).toBeInTheDocument()
    expect(screen.queryByText('World War II key events')).not.toBeInTheDocument()

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('World War II key events')).toBeInTheDocument()

    // 3. Delete note with confirmation dialog
    const deleteBtn = screen.getByRole('button', { name: 'Delete World War II key events' })
    await user.click(deleteBtn)
    expect(screen.getByRole('heading', { name: 'Delete this note?' })).toBeInTheDocument()

    // Confirm delete
    await user.click(screen.getByRole('button', { name: 'Delete note' }))
    expect(screen.queryByText('World War II key events')).not.toBeInTheDocument()
    expect(useNotesStore.getState().notes.some((n) => n.title === 'World War II key events')).toBe(false)
  })

  it('validates manual quiz authoring input requirements', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /quizzes/i }))
    await user.click(screen.getByRole('button', { name: /create quiz/i }))

    expect(screen.getByRole('heading', { name: 'Create a quiz' })).toBeInTheDocument()

    // Attempt to submit empty form
    await user.click(screen.getByRole('button', { name: /save quiz/i }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/a title is required/i)).toBeInTheDocument()
    expect(screen.getByText(/a subject is required/i)).toBeInTheDocument()
  })

  it('detects and rejects overlapping session time conflicts in the Study Planner', async () => {
    const today = getTodayDate()

    // Create existing task from 10:00 for 45 minutes (10:00 - 10:45)
    usePlannerStore.getState().createTask({
      title: 'Existing Calculus Session',
      subject: 'Math',
      topic: 'Calculus',
      date: today,
      startTime: '10:00',
      durationMinutes: 45,
      priority: 'high',
      completed: false,
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /study planner/i }))
    await user.click(screen.getByRole('button', { name: /new task/i }))

    // Fill form with an overlapping start time at 10:30 (overlaps 10:00 - 10:45)
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Conflicting Physics Session' } })
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Physics' } })
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: 'Optics' } })
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:30' } })
    fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: '30' } })

    await user.click(screen.getByRole('button', { name: 'Add task' }))

    // Assert overlap conflict error is surfaced in form alert
    expect(screen.getByRole('alert')).toHaveTextContent(/overlaps another session from 10:30 to 10:45/i)
  })
})

