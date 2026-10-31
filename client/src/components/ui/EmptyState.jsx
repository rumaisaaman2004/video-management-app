/** Friendly placeholder for lists with nothing in them, with an optional call to action. */
export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="text-center py-5 px-3">
      <i className={`bi bi-${icon} display-5 text-body-tertiary`} aria-hidden="true" />
      <h2 className="h5 mt-3">{title}</h2>
      {message && <p className="text-body-secondary mb-3">{message}</p>}
      {action}
    </div>
  );
}
