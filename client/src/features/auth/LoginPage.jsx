import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import { Link, Navigate, useLocation } from 'react-router';
import { FormField } from '../../components/ui/FormField.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { validators } from '../../lib/formErrors.js';
import { AuthCard } from './AuthCard.jsx';
import { useAuth } from './authContext.js';
import { redirectAfterAuth } from './authRedirect.js';
import { useAuthForm } from './useAuthForm.js';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  const showToast = useToast();
  const form = useAuthForm({
    initialValues: { email: '', password: '' },
    rules: { email: validators.email, password: validators.required('Password') },
    action: login,
  });

  if (isAuthenticated) return <Navigate to={redirectAfterAuth(location)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const user = await form.submit();
    if (user) showToast({ message: `Welcome back, ${user.name}!` });
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back! Sign in to continue watching."
      footer={
        <>
          New here?{' '}
          <Link to="/register" state={location.state} className="text-decoration-underline">
            Create an account
          </Link>
        </>
      }
    >
      {import.meta.env.DEV && (
        <Alert variant="info" className="small">
          <strong>Demo accounts:</strong> admin@example.com or user@example.com, password{' '}
          <code>Password123!</code>
        </Alert>
      )}
      {form.formError && <Alert variant="danger">{form.formError}</Alert>}

      <Form noValidate onSubmit={handleSubmit}>
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
          autoComplete="current-password"
          required
          value={form.values.password}
          onChange={form.handleChange}
          error={form.fieldErrors.password}
        />
        <Button type="submit" className="w-100" disabled={form.isSubmitting}>
          {form.isSubmitting && (
            <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
          )}
          Sign in
        </Button>
      </Form>
    </AuthCard>
  );
}
