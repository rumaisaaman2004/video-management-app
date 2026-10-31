import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { useAuth } from './authContext.js';

const memberSinceFormat = new Intl.DateTimeFormat('en', { dateStyle: 'long' });

export function AccountPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title="Your account" />
      <Card style={{ maxWidth: '32rem' }}>
        <Card.Body>
          <dl className="row mb-0">
            <dt className="col-sm-4">Name</dt>
            <dd className="col-sm-8">{user.name}</dd>
            <dt className="col-sm-4">Email</dt>
            <dd className="col-sm-8">{user.email}</dd>
            <dt className="col-sm-4">Role</dt>
            <dd className="col-sm-8">
              <Badge bg={user.role === 'admin' ? 'primary' : 'secondary'}>
                {user.role === 'admin' ? 'Administrator' : 'Member'}
              </Badge>
            </dd>
            <dt className="col-sm-4">Member since</dt>
            <dd className="col-sm-8 mb-0">{memberSinceFormat.format(new Date(user.createdAt))}</dd>
          </dl>
        </Card.Body>
      </Card>
    </>
  );
}
