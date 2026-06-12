import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Dashboard } from './Dashboard'
import {
  sampleApplication,
  sampleCategory,
  sharedApplication,
} from '../../test/fixtures'

describe('Dashboard', () => {
  it('renders filtered applications', () => {
    render(
      <Dashboard
        applications={[sampleApplication, sharedApplication]}
        categories={[sampleCategory]}
        searchQuery=""
        categoryFilter="All"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canEdit
      />,
    )

    expect(screen.getByText('Firewall Admin')).toBeInTheDocument()
    expect(screen.getByText('Shared VPN')).toBeInTheDocument()
  })

  it('shows the read-only empty state when no shared connections exist', () => {
    render(
      <Dashboard
        applications={[]}
        categories={[]}
        searchQuery=""
        categoryFilter="All"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canEdit={false}
      />,
    )

    expect(screen.getByText('No shared connections')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No connections have been shared with you yet. Contact your administrator.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the editable empty state for users who can add applications', () => {
    render(
      <Dashboard
        applications={[]}
        categories={[]}
        searchQuery="missing"
        categoryFilter="All"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canEdit
      />,
    )

    expect(screen.getByText('No applications found')).toBeInTheDocument()
    expect(
      screen.getByText('Try adjusting your search or filter, or add a new application.'),
    ).toBeInTheDocument()
  })
})
