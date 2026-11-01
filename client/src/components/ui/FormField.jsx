import { useId } from 'react';
import Form from 'react-bootstrap/Form';

/**
 * A labelled form control with help text and a validation message, wired up
 * for screen readers (aria-invalid / aria-describedby).
 *
 * `as` may be "input" (default), "textarea" or "select" (pass `options`).
 * Every other prop goes to the control: name, value, onChange, type, required...
 */
export function FormField({
  label,
  error,
  help,
  as = 'input',
  options = [],
  className,
  ...controlProps
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help && helpId, error && errorId].filter(Boolean).join(' ') || undefined;

  const sharedProps = {
    id,
    isInvalid: Boolean(error),
    // Bootstrap's isInvalid only adds a red style; this tells screen readers too.
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    ...controlProps,
  };

  return (
    <Form.Group className={className ?? 'mb-3'}>
      <Form.Label htmlFor={id}>
        {label}
        {controlProps.required && (
          <span className="text-danger-emphasis" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </Form.Label>

      {as === 'select' ? (
        <Form.Select {...sharedProps}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      ) : (
        <Form.Control as={as === 'input' ? undefined : as} {...sharedProps} />
      )}

      {help && (
        <Form.Text id={helpId} muted>
          {help}
        </Form.Text>
      )}
      {error && (
        <Form.Control.Feedback type="invalid" id={errorId}>
          {error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
}
