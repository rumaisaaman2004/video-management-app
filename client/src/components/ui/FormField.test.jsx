import { render, screen } from '@testing-library/react';
import { FormField } from './FormField.jsx';

describe('FormField', () => {
  it('labels the control and marks required fields', () => {
    render(<FormField label="Title" name="title" required defaultValue="" />);

    const input = screen.getByRole('textbox', { name: /Title/ });
    expect(input).toBeRequired();
  });

  it('connects help text and errors for screen readers', () => {
    render(
      <FormField
        label="Title"
        name="title"
        help="Shown on the video card"
        error="Title is required"
        defaultValue=""
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Title' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Shown on the video card Title is required');
  });

  it('is not marked invalid without an error', () => {
    render(<FormField label="Title" name="title" defaultValue="" />);

    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('renders a textarea or a select', () => {
    render(
      <>
        <FormField label="Description" as="textarea" defaultValue="" />
        <FormField
          label="Visibility"
          as="select"
          defaultValue="public"
          options={[
            { value: 'public', label: 'Public' },
            { value: 'private', label: 'Private' },
          ]}
        />
      </>,
    );

    expect(screen.getByRole('textbox', { name: 'Description' }).tagName).toBe('TEXTAREA');
    expect(screen.getByRole('combobox', { name: 'Visibility' })).toHaveValue('public');
  });
});
