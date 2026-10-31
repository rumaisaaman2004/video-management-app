import Card from 'react-bootstrap/Card';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/** Centered card shared by the sign-in and registration pages. */
export function AuthCard({ title, subtitle, children, footer }) {
  useDocumentTitle(title);

  return (
    <div className="mx-auto py-md-4" style={{ maxWidth: '26rem' }}>
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h1 className="h4 mb-1">{title}</h1>
          {subtitle && <p className="text-body-secondary mb-4">{subtitle}</p>}
          {children}
        </Card.Body>
        {footer && <Card.Footer className="text-center py-3 bg-transparent">{footer}</Card.Footer>}
      </Card>
    </div>
  );
}
