import { useQuery } from '@tanstack/react-query';
import { timetableService } from './timetableService';

export const timetableKeys = { all: () => ['timetable'] };

/**
 * A village schedule changes a few times a year, so it is cached generously and served from
 * the offline cache like the other low-churn public reads.
 */
export function useTimetable() {
  return useQuery({
    queryKey: timetableKeys.all(),
    queryFn: () => timetableService.timetable(),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });
}
