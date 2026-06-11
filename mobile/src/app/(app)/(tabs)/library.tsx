import { EmptyState, Screen } from '@/shared/ui';

export default function LibraryTab() {
  return (
    <Screen title="Library">
      <EmptyState title="Coming soon" message="All your generated videos will live here." />
    </Screen>
  );
}
