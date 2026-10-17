import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createInitialDashboardState, useDashboardStore } from './store/dashboardStore'
import { createInitialPlannerState, usePlannerStore } from './store/plannerStore'

beforeEach(() => {
  localStorage.clear()
  useDashboardStore.setState(createInitialDashboardState())
  usePlannerStore.setState(createInitialPlannerState())
})

afterEach(() => cleanup())

describe('MindForge dashboard behavior', () => {
  it('renders personalized dashboard metrics and demo data notice', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /good morning, durga/i })).toBeInTheDocument()
    expect(screen.getByText('Daily goals')).toBeInTheDocument()
    expect(screen.getByText('Study time')).toBeInTheDocument()
    expect(screen.getByText('Quiz accuracy')).toBeInTheDocument()
    expect(screen.getByText(/demo data/i)).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
  })

  it('marks a study task complete and gives immediate feedback', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Complete Practice quadratic equations', pressed: false }))

    expect(screen.getByRole('button', { name: 'Completed Practice quadratic equations' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Practice quadratic equations marked complete.')
  })

  it('shows a useful empty state after activity is cleared', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /clear activity/i }))

    expect(screen.getByText('No recent activity yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restore demo activity/i })).toBeInTheDocument()
  })

  it('opens the interactive quiz workspace from navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /quizzes/i }))

    expect(screen.getByRole('heading', { name: 'Quizzes' })).toBeInTheDocument()
    expect(screen.getByText(/local generation, clearly labeled/i)).toBeInTheDocument()
  })

  it('completes a planner task and writes one activity item to the dashboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /study planner/i }))
    expect(screen.getByRole('heading', { name: 'Study planner' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /new task/i }))
    await user.type(screen.getByLabelText('Title'), 'Review planner task')
    await user.type(screen.getByLabelText('Subject'), 'Biology')
    await user.type(screen.getByLabelText('Topic'), 'Cell energy')
    await user.click(screen.getByRole('button', { name: 'Add task' }))
    await user.click(screen.getByRole('button', { name: 'Complete Review planner task', pressed: false }))
    expect(screen.getByRole('status')).toHaveTextContent('Review planner task marked complete.')

    await user.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByText('Review planner task completed')).toBeInTheDocument()
  })
})
