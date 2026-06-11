import { EmptyState, Screen } from '@/shared/ui';

export default function HomeTab() {
  return (
    <Screen title="Home">
      <EmptyState title="Coming soon" message="Your recent videos will appear here." />
    </Screen>
  );
}
