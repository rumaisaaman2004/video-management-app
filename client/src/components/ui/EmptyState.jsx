/**
 * Friendly placeholder for lists with nothing in them, with an optional call to action.
 * Pass `titleAs="h1"` when the message is the whole page (e.g. "Page not found"),
 * so the page still has its one main heading.
 */
export function EmptyState({ icon = 'inbox', title, message, action, titleAs: Title = 'h2' }) {
  return (
    <div className="text-center py-5 px-3">
      <i className={`bi bi-${icon} display-5 text-body-tertiary`} aria-hidden="true" />
      <Title className="h5 mt-3">{title}</Title>
      {message && <p className="text-body-secondary mb-3">{message}</p>}
      {action}
    </div>
  );
}
