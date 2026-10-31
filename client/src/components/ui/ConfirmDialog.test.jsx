import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog.jsx';

function renderDialog(props = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() };
  render(
    <ConfirmDialog
      show
      title="Delete video?"
      message="This cannot be undone."
      confirmLabel="Delete"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('ConfirmDialog', () => {
  it('confirms or cancels', async () => {
    const { onConfirm, onCancel } = renderDialog();

    expect(screen.getByRole('dialog', { name: 'Delete video?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('disables both buttons while the action runs', () => {
    renderDialog({ isConfirming: true });

    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
