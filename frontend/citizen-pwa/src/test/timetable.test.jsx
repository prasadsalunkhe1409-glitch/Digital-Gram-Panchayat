import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

/**
 * The citizen timetable section.
 *
 * The case that matters is the empty one. A village that has not entered its schedule must say
 * so, because the alternative — a plausible-looking default — sends a citizen to the roadside
 * with their bin at a time nobody collects. Both services therefore always render, and an
 * unpublished one reads as "not published yet" rather than disappearing.
 */
const { state } = vi.hoisted(() => ({
  state: { q: { data: undefined, isLoading: false, isError: false, refetch: () => {} } },
}));

vi.mock('@/features/timetable/hooks', () => ({ useTimetable: () => state.q }));

const { TimetableSection } = await import('@/features/timetable/TimetableSection');

const entry = (over = {}) => ({
  id: '1',
  serviceType: 'Ghantagadi',
  title: 'Ward 1 collection',
  titleMr: 'प्रभाग १ संकलन',
  area: 'Ward 1',
  day: 'Monday',
  startTime: '07:30',
  endTime: '09:00',
  note: '',
  noteMr: '',
  ...over,
});

const ok = (data) => {
  state.q = { data, isLoading: false, isError: false, refetch: () => {} };
};

describe('citizen timetable', () => {
  it('names both services even when nothing is published', () => {
    ok({ Ghantagadi: [], WaterSupply: [] });
    render(<TimetableSection />);

    expect(screen.getByRole('heading', { name: /ghantagadi/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /water supply/i })).toBeInTheDocument();
    // Two cards, two empty notices — no invented timings anywhere.
    expect(screen.getAllByText(/has not published this schedule yet/i)).toHaveLength(2);
  });

  it('shows the day and time of a published slot', () => {
    ok({ Ghantagadi: [entry()], WaterSupply: [] });
    render(<TimetableSection />);

    expect(screen.getByText('Ward 1 collection')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('07:30 – 09:00')).toBeInTheDocument();
  });

  it('shows a single arrival time when there is no end time', () => {
    ok({ Ghantagadi: [entry({ endTime: '' })], WaterSupply: [] });
    render(<TimetableSection />);

    expect(screen.getByText('07:30')).toBeInTheDocument();
    expect(screen.queryByText(/–/)).toBeNull();
  });

  it('still shows the other service when only one is published', () => {
    ok({ Ghantagadi: [entry()], WaterSupply: [] });
    render(<TimetableSection />);

    expect(screen.getByText('Ward 1 collection')).toBeInTheDocument();
    expect(screen.getAllByText(/has not published this schedule yet/i)).toHaveLength(1);
  });

  it('tells the citizen the schedule failed to load, which is not the same as empty', () => {
    state.q = { data: undefined, isLoading: false, isError: true, refetch: () => {} };
    render(<TimetableSection />);

    expect(screen.queryByText(/has not published this schedule yet/i)).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
