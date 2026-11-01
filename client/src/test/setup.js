import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { setAccessToken } from '../lib/apiClient.js';
import { server } from './server.js';

// findBy*/waitFor give up after 1s by default, which busy machines and CI servers running
// test files in parallel can exceed. An element that never appears still fails, just later.
configure({ asyncUtilTimeout: 3000 });

// jsdom does not implement scrolling; pages call it when changing page.
window.scrollTo = () => {};

// Any request without a matching handler fails the test, so nothing slips through untested.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  setAccessToken(null);
});

afterAll(() => server.close());
