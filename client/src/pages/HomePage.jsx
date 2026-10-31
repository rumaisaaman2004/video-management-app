import { EmptyState } from '../components/ui/EmptyState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';

export function HomePage() {
  return (
    <>
      <PageHeader title="Video library" subtitle="Browse and watch educational videos." />
      <EmptyState
        icon="collection-play"
        title="The library is on its way"
        message="Videos will appear here once the library page is connected to the API."
      />
    </>
  );
}
