import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppCard } from './AppCard'
import { sampleApplication, sampleCategory, sharedApplication } from '../../test/fixtures'

describe('AppCard', () => {
  it('shows edit and delete actions when editing is allowed', () => {
    render(
      <AppCard
        application={sampleApplication}
        category={sampleCategory}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canEdit
      />,
    )

    expect(screen.getByLabelText(`Edit ${sampleApplication.name}`)).toBeInTheDocument()
    expect(screen.getByLabelText(`Delete ${sampleApplication.name}`)).toBeInTheDocument()
  })

  it('hides edit and delete actions for read-only shared connections', () => {
    render(
      <AppCard
        application={sharedApplication}
        category={sampleCategory}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canEdit={false}
      />,
    )

    expect(screen.getByText('Shared connection')).toBeInTheDocument()
    expect(screen.queryByLabelText(`Edit ${sharedApplication.name}`)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(`Delete ${sharedApplication.name}`)).not.toBeInTheDocument()
  })

  it('does not delete when confirmation is rejected', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <AppCard
        application={sampleApplication}
        category={sampleCategory}
        onEdit={vi.fn()}
        onDelete={onDelete}
        canEdit
      />,
    )

    await user.click(screen.getByLabelText(`Delete ${sampleApplication.name}`))
    expect(onDelete).not.toHaveBeenCalled()
  })
})
