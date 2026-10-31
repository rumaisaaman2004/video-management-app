import '@testing-library/jest-dom/vitest';
import { setAccessToken } from '../lib/apiClient.js';
import { server } from './server.js';

// Any request without a matching handler fails the test, so nothing slips through untested.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  setAccessToken(null);
});

afterAll(() => server.close());
