import { cleanup, render, screen } from '@testing-library/react'
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

describe('Phase 6 Learning Analytics, Gamification & Achievements', () => {
  it('navigates to the dedicated Learning Analytics page and toggles date filters', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click Analytics nav
    await user.click(screen.getByRole('button', { name: /analytics/i }))

    expect(screen.getByRole('heading', { name: 'Learning Analytics' })).toBeInTheDocument()
    expect(screen.getByText('Quiz Accuracy Over Time')).toBeInTheDocument()
    expect(screen.getByText('Study Time by Day')).toBeInTheDocument()
    expect(screen.getByText('Subject-Wise Performance')).toBeInTheDocument()
    expect(screen.getByText('Learning Activity History')).toBeInTheDocument()

    // Test date filters
    const filter30d = screen.getByRole('button', { name: '30 Days' })
    await user.click(filter30d)
    expect(filter30d).toHaveAttribute('aria-pressed', 'true')

    const filterAll = screen.getByRole('button', { name: 'All Time' })
    await user.click(filterAll)
    expect(filterAll).toHaveAttribute('aria-pressed', 'true')
  })

  it('navigates to Achievements & XP page and toggles XP rules', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click Achievements nav
    await user.click(screen.getByRole('button', { name: /achievements/i }))

    expect(screen.getByRole('heading', { name: 'Achievements & XP' })).toBeInTheDocument()
    expect(screen.getByText('Current Rank')).toBeInTheDocument()
    expect(screen.getByText('Novice Scholar')).toBeInTheDocument()

    // Toggle How XP Works
    const rulesBtn = screen.getByRole('button', { name: /how xp works/i })
    await user.click(rulesBtn)

    expect(screen.getByText('Transparent XP System')).toBeInTheDocument()
    expect(screen.getByText('Quiz Completion')).toBeInTheDocument()
    expect(screen.getByText('+50 XP base')).toBeInTheDocument()
  })

  it('completes a quiz, awards XP idempotently, and unlocks First Steps achievement', async () => {
    const user = userEvent.setup()

    // Pre-create a manual quiz
    useQuizStore.getState().createManualQuiz({
      title: 'Physics Fundamentals',
      subject: 'Physics',
      topic: 'Mechanics',
      difficulty: 'easy',
      questions: [
        {
          prompt: 'What is velocity?',
          options: ['Speed with direction', 'Total distance', 'Mass in motion', 'Acceleration rate'],
          correctIndex: 0,
          explanation: 'Velocity is speed with direction.',
        },
      ],
    })

    render(<App />)

    // 1. Go to Quizzes page
    await user.click(screen.getByRole('button', { name: /quizzes/i }))
    expect(screen.getByRole('heading', { name: 'Quizzes' })).toBeInTheDocument()

    // 2. Start the quiz
    await user.click(screen.getByRole('button', { name: /start quiz/i }))

    // 3. Answer Option A (Speed with direction)
    await user.click(screen.getByRole('button', { name: /Speed with direction/i }))
    await user.click(screen.getByRole('button', { name: /submit quiz/i }))

    expect(screen.getByRole('heading', { name: '100%' })).toBeInTheDocument()

    // 4. Navigate to Achievements page to verify unlock
    await user.click(screen.getByRole('button', { name: /achievements/i }))

    // First Steps (first quiz completed) and Perfect Recall (100% score) should be unlocked!
    expect(screen.getByText('First Steps')).toBeInTheDocument()
    expect(screen.getByText('Perfect Recall')).toBeInTheDocument()

    // 5. Navigate to Learning Analytics to verify that real accuracy point is charted
    await user.click(screen.getByRole('button', { name: /analytics/i }))
    expect(screen.getByText('Physics Fundamentals completed')).toBeInTheDocument()
    expect(screen.getByText(/1 attempts/i)).toBeInTheDocument()
  }, 10000)

  it('completes a planner task and updates streak and study time analytics', async () => {
    const user = userEvent.setup()

    // Pre-create a planner task for today
    const today = getTodayDate()
    usePlannerStore.getState().createTask({
      title: 'Thermodynamics study',
      subject: 'Physics',
      topic: 'Heat transfer',
      date: today,
      durationMinutes: 25,
      priority: 'high',
      completed: false,
    })

    render(<App />)

    // Go to Study planner
    await user.click(screen.getByRole('button', { name: /study planner/i }))

    // Complete task
    await user.click(screen.getByRole('button', { name: 'Complete Thermodynamics study', pressed: false }))

    // Check Analytics
    await user.click(screen.getByRole('button', { name: /analytics/i }))
    expect(screen.getByText(/25 min total/i)).toBeInTheDocument()
    expect(screen.getByText(/100%/i)).toBeInTheDocument() // 1/1 task completed = 100%
  }, 10000)
})
