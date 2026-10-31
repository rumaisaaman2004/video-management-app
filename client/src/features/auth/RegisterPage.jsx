import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import { Link, Navigate, useLocation } from 'react-router';
import { FormField } from '../../components/ui/FormField.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { MIN_PASSWORD_LENGTH, validators } from '../../lib/formErrors.js';
import { AuthCard } from './AuthCard.jsx';
import { useAuth } from './authContext.js';
import { redirectAfterAuth } from './authRedirect.js';
import { useAuthForm } from './useAuthForm.js';

// A duplicate email comes back as a 409 without field details; show it on the email field.
function emailConflictToField(error) {
  return error?.status === 409 ? { email: error.message } : {};
}

function passwordsMustMatch(values) {
  return values.confirmPassword === values.password
    ? {}
    : { confirmPassword: 'Passwords do not match' };
}

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const location = useLocation();
  const showToast = useToast();
  const form = useAuthForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    rules: {
      name: validators.required('Name'),
      email: validators.email,
      password: validators.newPassword,
    },
    extraChecks: passwordsMustMatch,
    // Only these fields go to the server; the confirmation is checked here.
    action: ({ name, email, password }) => register({ name, email, password }),
    toFieldErrors: emailConflictToField,
  });

  if (isAuthenticated) return <Navigate to={redirectAfterAuth(location)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const user = await form.submit();
    if (user) showToast({ message: `Welcome, ${user.name}! Your account is ready.` });
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Save favourites, build playlists and pick up where you left off."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Sign in
          </Link>
        </>
      }
    >
      {form.formError && <Alert variant="danger">{form.formError}</Alert>}

      <Form noValidate onSubmit={handleSubmit}>
        <FormField
          label="Name"
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          value={form.values.name}
          onChange={form.handleChange}
          error={form.fieldErrors.name}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.values.email}
          onChange={form.handleChange}
          error={form.fieldErrors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={form.values.password}
          onChange={form.handleChange}
          error={form.fieldErrors.password}
        />
        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={form.values.confirmPassword}
          onChange={form.handleChange}
          error={form.fieldErrors.confirmPassword}
        />
        <Button type="submit" className="w-100" disabled={form.isSubmitting}>
          {form.isSubmitting && (
            <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
          )}
          Create account
        </Button>
      </Form>
    </AuthCard>
  );
}
