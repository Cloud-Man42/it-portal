import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShareConnectionsModal } from './ShareConnectionsModal'
import { sampleApplication, sampleShareableUser } from '../../test/fixtures'

describe('ShareConnectionsModal', () => {
  it('does not render when closed', () => {
    render(
      <ShareConnectionsModal
        open={false}
        shareableApplications={[sampleApplication]}
        users={[sampleShareableUser]}
        loading={false}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.queryByText('Share connections')).not.toBeInTheDocument()
  })

  it('shows guidance when there are no shareable users', () => {
    render(
      <ShareConnectionsModal
        open
        shareableApplications={[sampleApplication]}
        users={[]}
        loading={false}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(
      screen.getByText('Add editors or read-only users before sharing connections.'),
    ).toBeInTheDocument()
  })

  it('loads the selected user assignments and saves updated shares', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    const secondUser = {
      ...sampleShareableUser,
      id: 'user-editor',
      username: 'editor1',
      displayName: 'Editor One',
      role: 'editor' as const,
      applicationIds: [],
    }

    render(
      <ShareConnectionsModal
        open
        shareableApplications={[
          sampleApplication,
          { ...sampleApplication, id: 'app-2', name: 'DNS Admin' },
        ]}
        users={[sampleShareableUser, secondUser]}
        loading={false}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    )

    expect(screen.getByLabelText('Firewall Admin')).toBeChecked()

    await user.selectOptions(screen.getByRole('combobox', { name: 'User' }), secondUser.id)
    expect(screen.getByLabelText('Firewall Admin')).not.toBeChecked()

    await user.click(screen.getByLabelText('Firewall Admin'))
    await user.click(screen.getByRole('button', { name: 'Save shares' }))

    expect(onSave).toHaveBeenCalledWith(secondUser.id, ['app-1'])
  })

  it('disables save while loading', () => {
    render(
      <ShareConnectionsModal
        open
        shareableApplications={[sampleApplication]}
        users={[sampleShareableUser]}
        loading
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save shares' })).toBeDisabled()
  })
})
