import Button from 'react-bootstrap/Button';
import { useColorMode } from '../../hooks/useColorMode.js';

/** Switches between light and dark mode; the choice is remembered. */
export function ColorModeToggle() {
  const { mode, toggle } = useColorMode();
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={toggle}
      aria-label={`Switch to ${nextMode} mode`}
      title={`Switch to ${nextMode} mode`}
    >
      <i className={`bi bi-${mode === 'dark' ? 'sun' : 'moon-stars'}`} aria-hidden="true" />
    </Button>
  );
}
