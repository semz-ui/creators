import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Add something to get started"
        action={<button type="button">Add</button>}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Add something to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('matches the snapshot', () => {
    const { container } = render(<EmptyState title="Empty" description="None yet" />);
    expect(container).toMatchSnapshot();
  });
});
