import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/** The page's main heading (also used as the browser tab title) with optional actions. */
export function PageHeader({ title, subtitle, actions }) {
  useDocumentTitle(title);

  return (
    <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <div>
        <h1 className="h3 mb-1">{title}</h1>
        {subtitle && <p className="text-body-secondary mb-0">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
