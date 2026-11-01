import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast } from './toastContext.js';
import { ToastProvider } from './ToastProvider.jsx';

function SaveButton() {
  const showToast = useToast();
  return (
    <button type="button" onClick={() => showToast({ message: 'Video saved' })}>
      Save
    </button>
  );
}

describe('ToastProvider', () => {
  it('announces messages and lets the user dismiss them', async () => {
    render(
      <ToastProvider>
        <SaveButton />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Video saved');

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Video saved')).not.toBeInTheDocument();
  });

  it('explains a missing provider', () => {
    // React logs the thrown error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<SaveButton />)).toThrow('useToast must be used inside <ToastProvider>');
  });
});
