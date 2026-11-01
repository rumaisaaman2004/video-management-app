/**
 * Where to go after signing in or registering: the page that asked for a
 * login (saved by RequireAuth in the route state), or the library.
 */
export function redirectAfterAuth(location) {
  const from = location.state?.from;
  return from ? `${from.pathname}${from.search ?? ''}` : '/';
}
