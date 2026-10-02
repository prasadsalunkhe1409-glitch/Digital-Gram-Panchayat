import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timetableService } from './timetableService';

const key = ['admin', 'timetable'];

export function useAdminTimetable(params) {
  return useQuery({
    queryKey: [...key, params ?? {}],
    queryFn: () => timetableService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useTimetableMutations() {
  const qc = useQueryClient();
  // Invalidate the officer list and the public one: publishing is the whole point of this
  // screen, and the citizen cache must not keep serving the old schedule.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['timetable'] });
  };
  return {
    create: useMutation({
      mutationFn: (values) => timetableService.create(values),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, values }) => timetableService.update(id, values),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id) => timetableService.remove(id), onSuccess: invalidate }),
  };
}
