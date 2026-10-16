import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('MindForge dashboard foundation', () => {
  it('renders the main learning dashboard and core statistics', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /good morning, durga/i })).toBeInTheDocument()
    expect(screen.getByText('Weekly focus')).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new study session/i })).toBeInTheDocument()
  })
})
