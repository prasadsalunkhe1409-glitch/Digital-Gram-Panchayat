import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

/**
 * Every officer governance screen must tell an officer the difference between "there is
 * nothing here" and "we could not load it". Before this, each rendered the empty state on
 * a failed query — an officer would read "No meetings yet" when the truth was that the API was
 * unreachable, and would have no reason to retry.
 *
 * A browser check cannot reach this: signing in needs the API, so the API cannot be down for a
 * cold load of an authenticated screen. The hooks are stubbed instead.
 */
// vi.mock is hoisted above ordinary consts, so anything its factory closes over must be too.
const { state, noMutations } = vi.hoisted(() => {
  const idle = () => ({ data: undefined, isLoading: false, isError: false, refetch: () => {} });
  return {
    state: {
      meetings: idle(),
      projects: idle(),
      polls: idle(),
    },
    noMutations: () => ({
      create: { mutate: () => {}, isPending: false },
      update: { mutate: () => {}, isPending: false },
      remove: { mutate: () => {}, isPending: false },
    }),
  };
});

vi.mock('@/features/governance/hooks', () => ({
  useAdminMeetings: () => state.meetings,
  useAdminProjects: () => state.projects,
  useAdminPolls: () => state.polls,
  useMeetingMutations: noMutations,
  useProjectMutations: noMutations,
  usePollMutations: noMutations,
}));

import { MeetingsAdmin } from '@/features/governance/MeetingsAdmin';
import { ProjectsAdmin } from '@/features/governance/ProjectsAdmin';
import { PollsAdmin } from '@/features/governance/PollsAdmin';

const SCREENS = [
  ['Gram Sabha', MeetingsAdmin, 'meetings', 'Could not load meetings', 'No meetings yet'],
  ['Works', ProjectsAdmin, 'projects', 'Could not load works', 'No works yet'],
  ['Polls', PollsAdmin, 'polls', 'Could not load polls', 'No polls yet'],
];

const reset = () => {
  for (const key of Object.keys(state)) {
    state[key] = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
  }
};

const failing = () => ({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

const renderScreen = (Screen) =>
  render(
    <MemoryRouter>
      <Screen />
    </MemoryRouter>,
  );

beforeEach(reset);

describe.each(SCREENS)('%s screen states', (_name, Screen, key, errorText, emptyText) => {
  it('shows a retryable error when the query fails', () => {
    state[key] = failing();
    renderScreen(Screen);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(errorText);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('does not claim the list is empty while it is failing', () => {
    if (!emptyText) return;
    state[key] = failing();
    renderScreen(Screen);
    // The whole point: a failure must not read as "nothing here yet".
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument();
  });

  it('shows the empty state when the query genuinely returns nothing', () => {
    if (!emptyText) return;
    state[key] = {
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    renderScreen(Screen);
    expect(screen.getByText(emptyText)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows loading before either', () => {
    state[key] = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
    renderScreen(Screen);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
