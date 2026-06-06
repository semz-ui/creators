import { Link } from 'react-router-dom';

import { useBalance } from '../viewmodels/useBalance';

/** Compact credit-balance indicator for the app topbar. */
export function BalanceChip() {
  const { data } = useBalance();
  return (
    <Link
      to="/billing"
      className="rounded-full bg-sunken px-3 py-1 text-xs font-medium text-content-secondary hover:bg-line-subtle"
    >
      {data ? `${data.balance} credits` : '… credits'}
    </Link>
  );
}
